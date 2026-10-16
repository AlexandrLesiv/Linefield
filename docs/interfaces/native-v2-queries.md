# S02 v2 queries, outcomes, effects and shutdown
Status: OWNER APPROVED (decision 181); definitions complement native-v2.md. Not generated/compiled or an IPC wire format.

## Coherent projections
```c
typedef struct {
  LfDocumentPosition position;
  uint64_t pending_bytes, retired_sequence_floor, pending_generation;
  uint32_t phase, capabilities, pending_count, effect_count;
  uint32_t can_undo, can_redo, interaction_state, persistence_state;
} LfClientSummary;
typedef struct {
  LfUuid incarnation;
  uint64_t content_revision, after_paint_order;
  uint32_t has_cursor, page_size;
} LfStrokePageRequest;
typedef struct {
  LfUuid stroke, tool;
  uint64_t mutation_revision, paint_order, sample_count;
  LfPenSettings style;
  double translation_x, translation_y, uniform_scale;
} LfStrokeSummary;
typedef struct {
  LfUuid incarnation, stroke;
  uint64_t content_revision, mutation_revision, first_index;
  uint32_t count, reserved;
} LfStrokeSamplesRequest;
typedef struct {
  uint64_t stream_sequence, content_revision, metadata_revision;
  LfUuid incarnation, stroke;
  uint64_t mutation_revision;
  uint32_t kind, reserved;
} LfDocumentChange;
uint32_t lf_client_read_summary(
  LfRuntime r, LfClient c, LfClientSummary *summary);
LfCopyResult lf_document_copy_strokes(
  LfRuntime r, LfClient c, const LfStrokePageRequest *request,
  LfStrokeSummary *items, uint32_t capacity);
LfCopyResult lf_stroke_copy_actual_samples(
  LfRuntime r, LfClient c, const LfStrokeSamplesRequest *request,
  LfActualSample *samples, uint32_t capacity);
LfCopyResult lf_client_copy_changes(
  LfRuntime r, LfClient c, uint64_t after_stream_sequence,
  LfDocumentChange *changes, uint32_t capacity);
```
Change kind: 1 Insert, 2 Update, 3 Delete, 4 Metadata, 5 Reset. Delete carries removed stroke ID and zero mutation_revision; observed content revision fences projection. Empty stroke ID for metadata/reset. Query zero revision is not implicit wildcard: first obtain summary, then use its revision. Wrong incarnation/revision or expired stream => ResyncRequired, no partial outputs/consumption. Flags/unknown values validated; one coherent page, no unbounded pinned lease.
On remote resync, buffer bounded immutable source at one revision or restart if version changes; install only complete coherent projection. Under sustained churn pause/resync status rather than synthesize mixed artwork. Initial replica update can lag; never label local speculative preview durable. Rust renderer consumes local coherent model/projection; these queries do not force Swift to copy all geometry every frame. Native IPC adapter maps corresponding typed fields/chunks, not pointer structs.

## Outcomes and retirement
```c
typedef struct {
  LfUuid operation_id, execution_owner_generation, incarnation;
  uint64_t content_revision, metadata_revision;
  uint32_t outcome, reason;
  uint32_t body_match_verified, reserved;
} LfReceiptResult;
LfCopyResult lf_client_copy_receipts(
  LfRuntime r, LfClient c, const LfUuid *ids, uint32_t count,
  LfReceiptResult *results, uint32_t capacity);
LfCommandReply lf_client_acknowledge(
  LfRuntime r, LfClient c, uint64_t contiguous_terminal_sequence);
```
Outcomes 1 Pending, 2 DurableMutation, 3 Rejected, 4 NoOp, 5 Unknown. A newly connected authorized client may query old operation IDs; response identity must match retained pending command's original authority/incarnation/body. Exact body match is enforced server-side on attempted duplicate execution; outcome lookup never executes. UI may not treat a borrowed/shared receipt ID as authority.
Receipt lookup IDs must resolve to frozen pending semantic bodies retained by the calling Rust runtime. Missing local body => Unknown, never an identity-only success. Across IPC the adapter sends a named OutcomeQuery containing operation ID, original document/incarnation/owner generation, original client session/sequence and internally recomputed semantic fingerprint. The newly authenticated coordinator compares every field against its durable row; mismatch => Rejected/ArgumentMismatch, matching row => DurableMutation with body_match_verified=1. An absent row remains Unknown with flag0. Bind response to current query/attachment generation before retiring pending work. The digest is private Rust/typed-adapter data, not UI output or logs; it is not a bearer credential. No raw local handle crosses IPC.

Reads hydrate asynchronously from SQL; NotReady/temporary Pending is distinct from completed lookup Unknown. Rejected/NoOp are live-session evidence only; absence after crash remains Unknown. Raw fingerprints are never returned. Record in-memory binding of operation UUID to immutable admitted body and session.
Ack asserts contiguous terminal outcomes were incorporated, not that drawing data is newly saved; server verifies known terminal outcomes and rejects gaps/future sequence. It retires replay ability and permits eligible cleanup, never applies commands. Process reconnection creates new session/sequence domain; old generation query-only. No discard or retry-with-new-ID shortcut exposed for Unknown in this proposal.

## Retained pending work and operation observation
```c
typedef struct {
  uint64_t pending_generation, after_sequence;
  uint32_t page_size, has_cursor;
} LfPendingPageRequest;
typedef struct {
  LfUuid operation_id, original_client_session, affected_stroke;
  LfAuthority original_authority;
  uint64_t original_sequence, retained_sequence, retained_bytes;
  uint32_t command_kind, state, reason, has_preview;
} LfPendingSummary;
typedef struct {
  LfUuid operation_id;
  uint32_t state, reason;
  LfDocumentPosition position;
  uint32_t catalog_projection_pending, reserved;
} LfOperationSummary;
LfCopyResult lf_client_copy_pending(
  LfRuntime r, LfClient c, const LfPendingPageRequest *request,
  LfPendingSummary *items, uint32_t capacity);
uint32_t lf_operation_read(
  LfRuntime r, LfOperation operation, LfOperationSummary *summary);
```
Client summary additionally carries pending_generation (u64). Page order is a runtime-local monotonically assigned retained-record sequence, not reused client command sequence; LfPendingSummary includes retained_sequence (u64). Fresh attachment adopts access to that runtime's preserved records for the same document under current authorization. These records outlive old client/interaction handles; full app restart loses them by DB11-A. New pending state changes increment generation; cursor mismatch => ResyncRequired. Page<=128; copy insufficient capacity does not consume.
States: Pending, WaitingDependency, Durable, Conflict, Unknown, Rejected, NoOp using explicit generated numeric mapping. The owning Rust runtime retains complete immutable proposed arguments/geometry and can render its retained preview separately; native summary exposes only type/target/status/bytes, not arbitrary serialized bodies. No new conflict-preview screen is implemented or implicitly approved. A coalesced effect is never the only record of pending work.
LfOperation handles are ephemeral observation handles; after reconnect the stable pending list replaces stale handle queries. History reset never clears this list. No generic discard/reapply API introduced.

## Native effects
```c
typedef struct {
  LfEffect effect;
  LfClient client;
  LfOperation operation;
  LfAuthority authority;
  uint64_t confirmation_version, history_generation;
  uint64_t content_revision, metadata_revision;
  uint32_t kind, reason;
} LfNativeEffect;
typedef struct {
  uint64_t confirmation_version;
  uint32_t choice, reserved;
} LfConfirmationResult;
LfCopyResult lf_runtime_copy_effects(
  LfRuntime r, LfNativeEffect *effects, uint32_t capacity);
LfCommandReply lf_effect_accept(LfRuntime r, LfIntent intent, LfEffect effect);
LfCommandReply lf_effect_complete_confirmation(
  LfRuntime r, LfIntent intent, LfEffect effect,
  const LfConfirmationResult *result);
LfCommandReply lf_effect_presentation_failed(
  LfRuntime r, LfIntent intent, LfEffect effect, uint32_t reason);
```
Kinds: 1 ConfirmDelete, 2 ResolvePendingExit, 3 PendingOperationConflict, 4 ReconnectionRequired, 5 HistoryReset. Structured pending work is queryable independently; lost/coalesced notice cannot delete it. Choice IDs per kind: Cancel=0; ConfirmDelete=1 only kind1; Retry=2 or Stay=3 for pending-exit/reconnect; AcknowledgeNotice=4 only nonmutating notices. Do not introduce Discard/force-overwrite resolution without exact separately reviewed UX/contract. AcknowledgeNotice never deletes pending work.
Copy does not consume; accept reserves native presentation; matching completion idempotent, conflicting/stale completion rejects. Recheck authority/incarnation/history and relevant source/export versions before destructive action. Empty/history-only effects use appropriate zero optional handles; invalid mixed combinations reject. Native text/IME/dialog keyboard priority retained.

## Readiness and shutdown
```c
typedef struct { uint32_t status; int32_t owned_read_fd; } LfWakeResult;
typedef struct {
  uint32_t status, remaining_ready;
  uint64_t changes, ui_revision;
} LfDrainResult;
LfWakeResult lf_macos_take_wake_reader(LfRuntime r);
LfDrainResult lf_runtime_process_ready(LfRuntime r, uint32_t max_completions);
LfCommandReply lf_runtime_request_shutdown(LfRuntime r, LfIntent intent);
uint32_t lf_runtime_is_shutdown_ready(LfRuntime r);
uint32_t lf_runtime_destroy(LfRuntime r);
```
Runtime owns nonblocking pipe writer; transfer duplicate read FD once, host owns/cancels/closes it. Publish completion before wake; EAGAIN means signaled, not permission to drop work. Drain <=64/2ms then rearm under queue synchronization; prove producer/reread races. Shutdown stops admission, settles approved jobs/saves, stops writers, delivers ShutdownReady, then host cancels DispatchSource and closes read FD after cancellation completion, then destroys runtime. No worker joins on active UI thread; no writer into closed reused FD. Windows/browser use their own readiness mechanism.
No compile/layout/runtime test performed; exact macOS bootstrap/IPC/native-grant capability probes remain owner-review and implementation gates.
