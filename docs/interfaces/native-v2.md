# S02 v2 typed native command contract
Status: owner-approved concrete declaration proposal (decision 181). Not a generated header, compiled ABI or implementation. Co-built first app/library still proposes ABI version 1; review version is not deployed version. Supersedes native-v1.md command identity/session ownership where inconsistent. CT-01–05/07/09.

## Boundary rules
Rust owns named command semantics. Proposed generated C declarations come from Rust repr(C) definitions via cbindgen; no handwritten C engine. Swift imports generated declarations; JNI/WinUI hosts receive their reviewed typed adapters; Wasm uses typed exports with equivalent fixtures, not C pointers or Unix FDs.
All runtime/client/query/effect calls execute on that runtime's creating main thread; WrongThread/reentry/stale-handle reject. Remote IPC callbacks only enqueue validated owned typed messages; pointers/opaque local handles NEVER cross IPC. Peer identity comes from the platform, not origin/client UUID fields. No generic execute(blob), raw SQL, path-based authority or bypass-conflict API.
Inputs are borrowed for call duration, copied before enqueue. Foreign caller must supply valid aligned memory: Rust cannot validate arbitrary addresses safely. Check overflow/length/tags/UTF-8/finite values; NULL only with zero length. Outputs caller-owned. Fixed-width integer flags, reserved=0, no Rust enum/String/Vec/bool ABI. Registry handles encode slot+generation, never reuse exhausted generations. Containable panic poisons session/runtime; abort/OOM/invalid foreign memory not claimed recoverable.

## Shared declarations
```c
typedef struct { uint64_t value; } LfRuntime;
typedef struct { uint64_t value; } LfSession;
typedef struct { uint64_t value; } LfClient;
typedef struct { uint64_t value; } LfInteraction;
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
  LfUuid document, incarnation, owner_generation;
} LfAuthority;
typedef struct {
  LfUuid operation_id;
  uint64_t client_sequence;
  uint32_t origin, reserved;
} LfCommandId;
typedef struct {
  const LfUuid *operation_ids;
  uint32_t count, reserved;
} LfDependencies;
typedef struct {
  LfUuid stroke;
  uint64_t mutation_revision;
} LfStrokeExpected;
typedef struct {
  LfAuthority authority;
  uint64_t content_revision, metadata_revision;
  uint64_t durable_content_revision, durable_metadata_revision;
  uint64_t stream_sequence, history_generation;
} LfDocumentPosition;
typedef struct {
  uint32_t status, reason;
  LfOperation operation;
  LfInteraction interaction;
  LfDocumentPosition position;
} LfCommandReply;
typedef struct {
  uint32_t status, reason;
  uint64_t revision, items_written, text_written;
  uint64_t items_required, text_required;
} LfCopyResult;
typedef struct {
  double width, red, green, blue, alpha;
} LfPenSettings;
typedef struct {
  double x, y, pressure;
  uint64_t sample_index;
  uint32_t has_pressure, reserved;
} LfActualSample;
typedef struct {
  double dx, dy;
} LfTranslation;
typedef struct {
  double factor, anchor_x, anchor_y;
} LfScale;
typedef struct {
  double center_x, center_y, zoom;
  double width_points, height_points, backing_scale;
  uint64_t mapping_generation;
} LfCanvasMapping;
```
Status IDs: 0 Applied (memory only), 1 AcceptedPending, 2 NoOp, 3 Rejected, 4 InsufficientCapacity, 5 ResyncRequired, 6 NotReady. Stable proposed reasons: 0 None, 1 InvalidArgument, 2 WrongThread, 3 StaleHandle, 4 WrongAuthority, 5 StaleIncarnation, 6 StrokeConflict, 7 DependencyPending, 8 DependencyFailed, 9 Capacity, 10 Busy, 11 Permission, 12 Storage, 13 Unsupported, 14 Poisoned, 15 UnknownOutcome, 16 InteractionActive, 17 SequenceUsed, 18 ArgumentMismatch. Unknown codes reject safely, never parse English. Typed values map to en/uk native resources. Origin IDs from v1 are diagnostics only; authority derives from registered attachment.
Reply has zero interaction for non-begin calls, zero operation for immediate local-only changes. An AcceptedPending operation has a generation-tagged observation handle; stable command UUID separately survives connection loss. Mutation callers must not retry just because a result buffer was small: fixed replies are returned by value. Position is the locally known coherent state, not a promise of instantaneous remote state.

## Runtime, gallery and attachment
```c
typedef struct {
  uint32_t abi_version, effective_language;
  int32_t borrowed_library_directory_fd;
  uint32_t reserved;
} LfMacRuntimeConfig;
typedef struct {
  uint32_t status, reason;
  LfRuntime runtime;
} LfRuntimeResult;
LfRuntimeResult lf_macos_runtime_create(const LfMacRuntimeConfig *config);
LfCommandReply lf_runtime_start(LfRuntime r, LfIntent intent);
LfCommandReply lf_library_create_drawing(LfRuntime r, LfIntent intent);
LfCommandReply lf_document_connect(LfRuntime r, LfIntent intent, LfUuid document);
uint32_t lf_session_copy_attachment(
  LfRuntime r, LfSession session, LfClient *client, LfDocumentPosition *position);
LfCommandReply lf_document_rename(
  LfRuntime r, LfClient client, LfCommandId id,
  uint64_t expected_metadata_revision, LfUtf8 name);
LfCommandReply lf_library_request_delete(
  LfRuntime r, LfIntent intent, LfUuid document,
  LfUuid expected_incarnation, uint64_t expected_metadata_revision);
LfCommandReply lf_client_request_gallery(LfRuntime r, LfClient client, LfIntent intent);
LfCommandReply lf_client_request_disconnect(LfRuntime r, LfClient client, LfIntent intent);
LfCommandReply lf_client_reconcile(LfRuntime r, LfClient client, LfIntent intent);
```
Mac bootstrap proposal replaces hidden services_config_handle: host opens its approved fixed library directory, retains original descriptor; runtime duplicates it, validates exact directory/managed layout asynchronously before Ready, owns duplicate until shutdown. Directory descriptor is process-local authority, not serialized storage configuration; reject symlink/identity swaps through relative guarded operations. Runtime create does not hydrate SQL on input thread. macOS descriptor checks and sandbox path/entitlement feasibility remain probe gates.
effective_language = 1 en, 2 uk (OS-resolved launch choice). General UI localization remains host-owned; Rust default-name strings only. Other OSes require their own bootstrap, not fake Unix descriptors.
Connect asynchronously acquires authority or authenticates existing host. It cannot self-assign owner generation. Runtime summary/effect yields accepted session. Rename of an unopened gallery item obtains a bounded headless attachment through the same coordinator path; no separate SQL rename implementation. One window per instance remains; peers are separate processes.
Delete confirms exact drawing/incarnation and applicable revisions/export dependencies, then rechecks at execution. No blanket consent from stale metadata alone. New source/dependency state refreshes confirmation.

## Client input and named editing commands
```c
LfCommandReply lf_tool_select(LfRuntime r, LfClient c, LfIntent i, LfUuid tool);
LfCommandReply lf_pen_set_settings(
  LfRuntime r, LfClient c, LfIntent i, const LfPenSettings *settings);
LfCommandReply lf_canvas_set_mapping(
  LfRuntime r, LfClient c, LfIntent i, const LfCanvasMapping *mapping);
LfCommandReply lf_viewport_pan(LfRuntime r, LfClient c, LfIntent i, LfTranslation delta);
LfCommandReply lf_viewport_zoom(
  LfRuntime r, LfClient c, LfIntent i, double factor, double anchor_x, double anchor_y);
LfCommandReply lf_selection_select_at(
  LfRuntime r, LfClient c, LfIntent i, double x, double y, uint64_t mapping_generation);
LfCommandReply lf_stroke_begin(
  LfRuntime r, LfClient c, LfIntent i, uint64_t mapping_generation,
  const LfActualSample *first);
LfCommandReply lf_stroke_append_actual(
  LfRuntime r, LfClient c, LfInteraction interaction,
  uint64_t input_sequence, uint64_t mapping_generation,
  const LfActualSample *samples, uint32_t count);
LfCommandReply lf_stroke_end(
  LfRuntime r, LfClient c, LfInteraction interaction,
  LfCommandId id, LfDependencies dependencies);
LfCommandReply lf_interaction_cancel(
  LfRuntime r, LfClient c, LfInteraction interaction, uint32_t reason);
LfCommandReply lf_move_begin(
  LfRuntime r, LfClient c, LfIntent i,
  LfStrokeExpected expected, uint64_t mapping_generation);
LfCommandReply lf_move_update(
  LfRuntime r, LfClient c, LfInteraction interaction,
  uint64_t input_sequence, LfTranslation translation);
LfCommandReply lf_scale_begin(
  LfRuntime r, LfClient c, LfIntent i,
  LfStrokeExpected expected, uint64_t mapping_generation);
LfCommandReply lf_scale_update(
  LfRuntime r, LfClient c, LfInteraction interaction,
  uint64_t input_sequence, LfScale scale);
LfCommandReply lf_transform_commit(
  LfRuntime r, LfClient c, LfInteraction interaction,
  LfCommandId id, LfDependencies dependencies);
LfCommandReply lf_selection_delete(
  LfRuntime r, LfClient c, LfCommandId id, LfStrokeExpected expected,
  LfDependencies dependencies);
LfCommandReply lf_history_undo(LfRuntime r, LfClient c, LfCommandId id);
LfCommandReply lf_history_redo(LfRuntime r, LfClient c, LfCommandId id);
LfCommandReply lf_save_flush(LfRuntime r, LfClient c, LfIntent intent);
```
Capture validated settings at begin; style/tool/Undo/pan/zoom guards remain shared and client-scoped. New stroke UUID assigned by authoritative Rust, never trusted from caller. Actual samples logical f64 coordinates with explicit pressure presence, monotonically ordered sample_index. Batch invalidity cancels only current client's interaction atomically; predictions absent initially. Typed sample correction feature remains deferred. End creates one command/receipt/history entry; cancel/no-op none.
Mapping change cancels unfinished interaction first; old samples cannot enter new mapping. Transform updates absolute relative to captured base, not cumulative deltas. Repeated same input_sequence/body idempotent; stale/different body rejects. Commit rechecks captured whole-stroke token despite visible preview. No reservation. Input channel ordering must deliver acknowledged actual batches before End; queue backpressure cannot drop them.
Command sequence is monotonically allocated per authenticated client session within a bounded window. Independent later commands may finish while earlier dependants wait; engine derives read/write footprint and ordering constraints. Supplied dependencies add checks, never weaken them. Unknown/missing dependency evidence pauses. No exposed arbitrary atomic batch; each named logical operation remains one Undo boundary.

## Scope and complements
See native-v2-queries.md for all new query/output/effect DTOs. Existing v1 gallery LfPageRequest/LfLibraryItem/LfRuntimeSummary keep their typed copied-buffer contract, with database_incarnation added to LfLibraryItem and LfDocumentPosition replacing obsolete session revision-only summaries. Schema/name/page rules remain as selected.
File exchange is retained as reviewed semantic flows, but exact persistent native access-grant bootstrap and macOS IPC endpoint discovery are material feasibility gates. See the main packet: do not call these implemented or hide them behind arbitrary opaque config. No new generic command protocol or agent capability is introduced.
