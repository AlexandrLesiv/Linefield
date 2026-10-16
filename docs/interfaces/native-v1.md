Current proposal: [S02 consolidated v2](../reviews/S02-consolidated-v2.md). This older draft is historical where v2 differs; its pending-choice notes must not reopen decisions through 180. No implementation approval is implied.

Multi-client scope update: decisions 163–164 require client-scoped interactions and coordinator operations/change subscriptions. The gallery-first signatures below are incomplete for that scope. See ../architecture/incremental-collaboration.md and S02M; no new ABI is frozen.

Owner update: DB7-A selects caller-owned bounded outputs; DB8-A selects the macOS readiness-pipe direction (decisions 161–162). This does not freeze every declaration or prove lifetime/shutdown correctness. DB5/DB6 remain unresolved.

# Typed native interface — proposal v1

Status: **documentation only, not a generated header or approved ABI**. CT-01–05/07/09.
Rust engine commands remain the semantic authority. cbindgen-generated C declarations expose
Rust repr(C) DTOs; Swift imports them through thin checked wrappers. No handwritten C implementation,
UniFFI runtime, generic command packet, JSON commands or native duplicate save policy.

This revision gives the gallery-first contract a concrete shape. Canvas/file-exchange entry points
are staged below; their full DTOs and the native access-grant adapter must be reviewed before code.

## Common representations

```c
typedef struct { uint64_t value; } LfRuntime;
typedef struct { uint64_t value; } LfSession;
typedef struct { uint64_t value; } LfOperation;
typedef struct { uint64_t value; } LfEffect;
typedef struct { uint8_t bytes[16]; } LfUuid;
typedef struct { const uint8_t *data; uint64_t length; } LfUtf8;
typedef struct { uint64_t offset, length; } LfTextRange;
typedef struct {
  uint64_t sequence;
  uint32_t origin, reserved;
} LfIntent;
typedef struct {
  uint32_t status, reason;
  uint64_t request_sequence, changes, ui_revision;
  uint64_t content_revision, metadata_revision;
  LfOperation operation;
} LfReply;
typedef struct {
  uint32_t status, reason;
  uint64_t revision, items_written, text_written;
  uint64_t items_required, text_required;
} LfCopyResult;
typedef struct {
  uint32_t abi_version, reserved;
  uint64_t services_config_handle;
} LfRuntimeConfig;
typedef struct {
  uint32_t status, reason;
  LfRuntime runtime;
} LfRuntimeResult;
```

ABI version 1 is a proposed co-built app/library compatibility check, not semantic versioning of tools.
services_config_handle is an opaque token registered by the platform integration bootstrap; it is
not a path, serializable config blob or native pointer. That bootstrap's exact access/surface setup
is a separate pre-code signature gate. No hidden global service locator is implied.

Status IDs: 0 Applied/Ok, 1 AcceptedPending, 2 NoOp, 3 Rejected, 4 InsufficientCapacity,
5 ResyncRequired. Functions document which apply. Reason IDs are stable integers mapped to native
localized resources; unknown values fail closed. Proposed origins: 1 control, 2 shortcut, 3 pointer,
4 OS lifecycle, 5 authenticated peer, 6 internal effect completion. These are diagnostic origin labels,
**not credentials**; peer permission is checked before entering the same dispatcher. Agents deferred.

Zero handles are invalid. Encode registry slot plus generation; retire exhausted slots rather than
wrapping into stale validity. Validate runtime, session, generation and owner thread before mutation.
Persistent UUIDs are canonical 16-byte values, not host GUID memory layout or ephemeral handles.

Foreign pointers must be valid, aligned, live and sized correctly; Rust cannot safely validate an
arbitrary address. NULL input/output is allowed only with zero corresponding length/capacity.
Validate lengths, overflow, UTF-8 and tags before dereference/use. Initialize padding/reserved fields.
Do not expose Rust String/Vec/bool/references/enums/trait objects through C.

Borrow input only for the call. Validate and copy anything queued before returning. Native callers
own output arrays/text. No Rust-allocated UI snapshot buffer or free() pairing crosses the boundary.

## Gallery commands

```c
LfRuntimeResult lf_runtime_create(const LfRuntimeConfig *config);
LfReply lf_runtime_start(LfRuntime runtime, LfIntent intent);
LfReply lf_library_create_drawing(LfRuntime runtime, LfIntent intent);
LfReply lf_library_open_drawing(
  LfRuntime runtime, LfIntent intent, LfUuid drawing);
LfReply lf_library_rename_drawing(
  LfRuntime runtime, LfIntent intent, LfUuid drawing,
  uint64_t expected_metadata_revision, LfUtf8 name);
LfReply lf_library_request_delete(
  LfRuntime runtime, LfIntent intent, LfUuid drawing,
  uint64_t expected_metadata_revision);
LfReply lf_library_retry_item(
  LfRuntime runtime, LfIntent intent, LfUuid drawing);
LfReply lf_session_request_gallery(
  LfRuntime runtime, LfIntent intent, LfSession session);
```

Commands return one fixed reply by value: there is no output-buffer retry that could re-execute
an edit. Applied is in-memory semantic success, not a durable-save claim. AcceptedPending identifies
an operation to observe. Open installs a new accepted session only after validation; failure preserves
the previously accepted route/session. Delete produces a revision-bound native confirmation effect.
Rename uses the owning Rust dispatcher and cross-process contract; the host never edits SQL directly.

Intent sequence is monotonically increasing per runtime; duplicate within a bounded retained window
returns its receipt, expired sequence rejects, same sequence/different arguments rejects. This is
in-process replay protection, not durable exactly-once behavior after restart. Receipt window capacity
is a pre-code gate. Queries have no intent and do not mutate business state.

## Coherent gallery queries

```c
typedef struct {
  LfUuid catalog_incarnation;
  uint64_t catalog_generation;
  uint64_t after_activity_order;
  LfUuid after_document;
  uint32_t has_cursor, page_size;
} LfPageRequest;
typedef struct {
  LfUuid document;
  LfTextRange name;
  uint64_t content_revision, metadata_revision, activity_order;
  int64_t created_utc_us, content_edited_utc_us;
  uint32_t availability, capabilities;
} LfLibraryItem;
typedef struct {
  LfUuid catalog_incarnation;
  uint64_t ui_revision, catalog_generation;
  LfSession active_session;
  uint32_t phase, pending_effect_count;
} LfRuntimeSummary;
typedef struct {
  LfUuid document;
  uint64_t ui_revision, content_revision, metadata_revision;
  uint64_t durable_content_revision, durable_metadata_revision;
  uint32_t interaction_state, persistence_state, capabilities, reserved;
} LfSessionSummary;
LfCopyResult lf_library_copy_page(
  LfRuntime runtime, const LfPageRequest *request,
  LfLibraryItem *items, uint64_t item_capacity,
  uint8_t *text, uint64_t text_capacity);
uint32_t lf_runtime_read_summary(
  LfRuntime runtime, LfRuntimeSummary *out_summary);
uint32_t lf_session_read_summary(
  LfRuntime runtime, LfSession session, LfSessionSummary *out_summary);
```

DB2-A selects persistent activity-order pagination. Exact allocation, retry and recovery transitions remain pre-code review gates. The first request has no cursor; continuations require matching catalog incarnation UUID and generation. Rebuild/replacement assigns a fresh incarnation and invalidates all old cursors, hydration work and completions across processes.
One call returns a coherent page. Text ranges reference only the caller buffer of that call.
Insufficient capacity writes no partial items/text and consumes no events. A subsequent sizing retry
may observe newer state and must check revision or resynchronize; it does not pin an unbounded snapshot.
Query results come from bounded in-memory projections; disk hydration is asynchronous, not SQL on input.

Typed collection deltas remain a follow-up DTO before gallery implementation; do not fake their
completeness with an untyped blob. Coarse change flags plus fresh bounded pages form the initial
proposal pending that review. Preserve scroll anchor/focus and reserved thumbnail layout.

## Effects and operation status

```c
typedef struct {
  LfEffect effect;
  LfOperation operation;
  LfUuid document;
  uint64_t confirmation_version;
  uint64_t content_revision, metadata_revision;
  uint32_t kind, reserved;
} LfNativeEffect;
typedef struct {
  uint64_t confirmation_version;
  uint32_t choice, reserved;
} LfConfirmationResult;
typedef struct {
  uint32_t state, reason;
  uint64_t content_revision, metadata_revision;
  uint32_t catalog_projection_pending, reserved;
} LfOperationSummary;
typedef struct {
  uint32_t status, remaining_ready;
  uint64_t changes, ui_revision;
} LfDrainResult;
LfCopyResult lf_runtime_copy_effects(
  LfRuntime runtime, LfNativeEffect *effects, uint64_t capacity);
LfReply lf_effect_accept(
  LfRuntime runtime, LfIntent intent, LfEffect effect);
LfReply lf_effect_complete_confirmation(
  LfRuntime runtime, LfIntent intent, LfEffect effect,
  const LfConfirmationResult *result);
uint32_t lf_operation_read(
  LfRuntime runtime, LfOperation operation, LfOperationSummary *out);
LfReply lf_operation_cancel(
  LfRuntime runtime, LfIntent intent, LfOperation operation);
LfDrainResult lf_runtime_process_ready(
  LfRuntime runtime, uint32_t max_completions);
```

Effects are a finite discriminated set: ConfirmDelete and ResolvePendingExit in this slice. No arbitrary payload or secretly serialized values. Additional effect types need explicit DTO review.
DB4-B removes the native default-name formatting effect/reply. Rust owns the full default-name messages and formatting for English/Ukrainian, using the effective language resolved by the host at launch. First English allocation renders “Untitled”, next “Untitled 2”; Ukrainian wording requires language review. Validate before publishing; failed creation can leave a sequence gap. Stored names never retranslate automatically.
The runtime/bootstrap still needs a reviewed typed effective-language input; no hidden global locale lookup or new ABI field is silently frozen by this text. General UI/error resources stay native.

Copying effects does not consume/present them. Explicit acceptance takes responsibility; completion
with matching nonce/version reports choice. Duplicate same completion is idempotent; mismatched/stale
completion rejects. Cancellation or presentation failure has its own bounded reason. Confirmation
does not confer blanket deletion rights after relevant source/export state changes.

## Thread ownership, wake and shutdown

All runtime/session command/query/effect calls run on the creating macOS main thread. No reentrant
mutation. Skia stays main-owned. SQL/logging belong to bounded service owners and no native widget
crosses into Rust document state. Native/Wasm ports may use a different reviewed scheduling adapter.

Propose a readiness-only nonblocking pipe; Rust owns the write end, Swift owns a duplicated read
descriptor monitored by a main-queue DispatchSourceRead. Publish owned completion before signal.
EAGAIN means readiness is already signaled, never permission to drop completion. A drain clears
readiness with queue synchronization and rechecks/rearms when work remains; prove race safety.

Proposed adapter signatures (macOS-specific, not portable core):
```c
typedef struct { uint32_t status; int32_t owned_read_fd; } LfWakeResult;
LfWakeResult lf_macos_take_wake_reader(LfRuntime runtime);
LfReply lf_runtime_request_shutdown(LfRuntime runtime, LfIntent intent);
uint32_t lf_runtime_is_shutdown_ready(LfRuntime runtime);
uint32_t lf_runtime_destroy(LfRuntime runtime);
```

take_wake_reader transfers the duplicate at most once. Every queue callback validates runtime generation.
Request shutdown stops admission and settles/cancels jobs under existing consent. Never join a slow
worker on the main input path. Shut writers down, cancel/drain the native source, close the transferred
read descriptor and destroy only after ShutdownReady. Deallocation is not implicit discard permission.
Exact source-cancel ordering and no-lost-wake proof require the native compile/stress probe.

WrongThread, stale handle and reentry reject without state changes. Catch containable panic at foreign
boundaries, poison affected session and prohibit unsafe persistence; infrastructure corruption poisons
runtime. Do not continue ordinary editing after panic. Abort/OOM/invalid foreign memory cannot be
promised recoverable. Stale worker completions cannot revive poisoned or closed sessions.

## Canvas and file-exchange extension map

These names show semantic separation; complete parameter DTOs are **not yet frozen**:
stroke_begin / append_actual / end; interaction_cancel; tool_select; pen_set_settings;
selection_select_at / delete; move_begin / update; scale_begin / update; transform_commit;
history_undo / redo; viewport_pan / zoom; canvas_set_mapping; save_flush;
import_request_native; export_request_native / png; export_cancel / retry.

Use f64 logical coordinates, explicit pressure presence and ordered indices; mapping/interaction
generations reject stale input. Atomic invalid batch cancels per decision 104. End commits once.
Predictions/agent transport are not added. All tools inherit shared active-interaction restrictions.

File panels return a platform-service access capability, not a trusted arbitrary path. Exact bookmark/
grant ownership, revocation, restart encoding and target identity are pre-code security gates.
Future web adapters reuse Rust commands/fixtures, not Unix descriptors/C pointer ABI shapes.

## Diagnostics and required tests

Central command/effect/worker events correlate ephemeral runtime/session, intent and operation,
safe outcome/reason/revision delta. Never names, paths, persistent UUIDs, raw samples, private
fingerprints or serialized state. Aggregate input activity, no per-sample production logging.
Log queue overflow/sink failure cannot fail an otherwise valid edit.

See [test and threat matrix](../../quality/S02-contract-review.md). Generated header compilation,
ABI layout, handle misuse, copied buffer lifetimes, resync, duplicate effects, wake races, panic/
shutdown and real native behavior must be verified separately. No tests have run for this proposal.
