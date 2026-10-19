Current coordination direction: multiple local editing clients share one authoritative Rust document coordinator (163–164). See [multi-client architecture](incremental-collaboration.md). 

# Component responsibilities

This is a review proposal, not an implemented contract. Rust owns editor semantics.
Swift owns AppKit objects, first-responder behavior, native presentation and window lifecycle.
Skia/Metal resources belong to one rendering owner. No native widget or GPU resource enters
the durable document. Prefer composition and explicit state machines over inheritance trees.

## Modules and dependency direction



Owner-selected crate split (2026-10-16): `editor-engine`, `editor-services`, `editor-renderer`,
`editor-native`. The engine combines pure domain and application modules rather than
creating several forwarding crates. Services execute effects; they do not become a second
editor. The native crate composes them and exposes an ABI; it contains no editing policy.
No generic plugin framework, command bus broker, service locator or speculative adapter
implementation. All planned apps/ host placeholders exist now. See [platform plan](../platforms.md):
engine/service contracts must support native and Wasm; isolate Metal/filesystem/executor
backends and review typed JNI/Wasm adapters separately before implementing those ports.

| Component | Owns | Does not own |
| --- | --- | --- |
| Swift `EditorWindowController` | Window, control lifetime and wiring | Document mutations or saved-revision policy |
| Swift `ToolPresenter` / `FilePresenter` | Native controls, menus, panels and focus; display Rust availability | Duplicate tool state or a second save state machine |
| Swift `InputAdapter` | Native samples, coordinate conversion and shortcut intent | Geometry, undo and document editing |
| Swift `CanvasView` / `FrameScheduler` | Surface lifecycle, resize/display scale and frame requests | Durable drawing data |
| Rust document coordinator | Shared document authority, command validation/order and persistence policy; exact hosting under S02M | UI objects or competing database writers |
| Rust client session | Client-scoped interactions, selection, tool/viewport state and reviewed Undo association | Independent authoritative drawing state |
| Rust `Document` / geometry modules | Ordered strokes, styles, transforms and validated coordinates | Selection, hover, transient predictions or GPU buffers |
| Rust `SceneBuilder` | Incremental immutable drawing data, bounds and visible-set preparation | OS window presentation |
| Rust `FileWorker` | Encode/decode, staging, durable-write attempt, recovery storage | Declaring the current document clean |
| Rust `SkiaRenderer` | Paths, caches, Metal-backed surfaces and submission | Input interpretation or authoritative document state |

Names are proposed responsibilities, not a mandate for one class per row. Rust uses structs,
enums and small traits where substitution is necessary; Swift composes native controllers.
Use an interface for file service/fault injection, not an abstraction for every value object.

## Commands and native effects

An illustrative command set is `BeginStroke`, `AppendSamples`, `EndStroke`,
`CancelInteraction`, `SelectAt`, `BeginMove`, `UpdateMove`, `BeginUniformScale`,
`UpdateScale`, `CommitTransform`, `DeleteSelection`, `Undo`, `Redo`, `SetBrush`,
`Pan`, `Zoom`, `RequestSave` and `RequestOpen`. These are semantic Rust types.
Sample batches have a specialized typed entry point for throughput, but reach the same
validation/state-transition logic. Future agents will use semantic commands and queries;
their transport, authentication and permissions are outside this milestone.

Native shortcuts first pass through AppKit's responder chain. Only editor intents reach
the dispatcher; typing P, V, Space or Delete in a text field must not manipulate the canvas.
Save requests completed-state persistence without a file panel (decision 56). File-exchange
commands can request native panels; their typed results return to Rust for validation of
session/operation identity before work is scheduled. Swift never sends “mark saved = true.”
Do not introduce `NSDocument` as a second persistence authority; revisit its integration
only with an explicit, reviewed division of responsibility.



Specify conflicts explicitly in S02: reject tool switches during active interactions without
queuing or cancellation (decision 75). An invalidating canvas remap cancels the interaction
before accepting the new mapping (decision 78). Interactions cannot overlap. A no-op transform
creates no history entry. Deletion is one transaction. Predictions are replaceable overlays;
only validated actual/corrected data becomes durable. Reject an invalid batch atomically.

## Thread ownership and parallelism



Owner selected this macOS starting topology on 2026-10-16: main-thread ownership for the
editor and Skia context, with an early performance checkpoint. This avoids cross-thread
document locking and extra scheduling latency, but expensive scene preparation or drawable
acquisition could still delay input. Frame work is scheduled outside input callbacks; that
alone does not make it parallel. Measure callback, preparation and submission costs separately.
Do not wait for disk or GPU completion from input handling. Defer a frame if the surface is
unavailable or in-flight capacity is full; real input still updates the editor in order.

Use one bounded storage worker initially, plus a bounded diagnostics drain. Workers own
immutable inputs and return typed results; they never touch editor/native objects. No task
or thread per sample. New/Open decode off-thread and replace state only after full validation.
Closing a session invalidates its generation; late results cannot mutate a replacement session.
Cancellation does not falsely promise to undo a rename that already completed.

Snapshot capture uses structural sharing of committed immutable stroke data. Avoid copying
all sample arrays on Save or every frame; bound and measure metadata capture on the owner.
Maintain document/session revisions separately from transient viewport/interaction versions.
Storage is serialized per destination so an older write cannot overwrite a newer one.

Queue admission must have count/byte bounds and defined outcomes. When busy, reject an
explicit request with a visible retryable result or retain one bounded pending request;
never silently lose it. Coalesce recovery snapshots/repaint requests to the newest complete
revision. Never drop accepted actual input samples. At an input/document limit, reject and
cancel the active transaction explicitly, report it, and preserve the prior committed state.
Freeze numeric capacities and overload behavior in S02, before implementation.

A dedicated render thread is an alternative if profiling establishes sustained main-thread
pressure. It requires immutable scene publication, generation rejection, render-resource
ownership, bounded latest-frame scheduling and platform-surface synchronization. An editor
worker adds command ordering and round-trip complexity. Neither is included speculatively.
Future hosts retain their own UI thread while using the same semantic engine; each port
must review its surface/worker topology, rather than copying AppKit scheduling blindly.

## Typed boundary and lifetime rules

Generate C-compatible declarations from Rust with cbindgen and import them in Swift through
a small wrapper. Generated C declarations are an ABI description, not a second handwritten
C application. No serialized command packets or handwritten duplicate headers. No UniFFI
runtime in this proposal. Concrete declarations remain an S02 owner-review deliverable.

Use opaque generation-checked session/render handles, fixed-width scalars, validated tags,
bounded sample slices and explicit statuses. Rust `Vec`, `String` and internal enums never
cross by layout. Input pointers are borrowed only during the call; retained data is owned.
Decision 32 selects native-owned copies of bounded UI results, not long-lived UI result leases.
Rust-internal scene sharing and opaque object handles have separate lifetime rules. No callbacks
reenter a mutation.
Detect wrong-thread and stale-handle use; contain panics at the ABI and poison the affected
session rather than continuing after unknown partial mutation. Invalid arbitrary foreign
pointers remain a caller-safety precondition; handle checks cannot make them safe.
Specify allocation failure/output capacity behavior before consuming an operation result.

## Caching and infinite canvas

Canonical coordinates are finite f64 values. Rebase visible geometry near the viewport
before GPU conversion. Use spatial bounds to cull offscreen strokes, not a canvas-sized bitmap.
Immutable committed geometry is cached by stroke ID, content/style/transform version and
geometry algorithm version. Raster caches additionally include zoom, device scale, color
space and relevant viewport/tile settings. Selection/hover/prediction are separate overlays.

Start with bounded geometry/path caching and incremental visible-set updates. No speculative
tile renderer or global raster cache. Bound CPU/GPU bytes, expose hits/misses/evictions and
release document-owned entries on close. Undo, move, style changes, resize, display migration
and device loss have explicit invalidation tests. Eviction affects speed, never correctness.
Overlapping/stress geometry must degrade within reviewed limits, not allocate indefinitely.

## Logging and resilience

Instrument input intent origin at the adapter, command outcome/state transitions centrally,
and operation boundaries in workers. Events use session/request/operation IDs, command name,
origin, revision, duration, outcome and allowlisted error category. Log stroke begin/end or
summary, not every sample or the document state. Never include content, coordinates, paths,
credentials or serialized files in normal logs. Timing traces are opt-in and bounded.

Drain logs off input callbacks, rotate local files, cap retention and count drops/sink errors.
Log failure cannot turn a successful edit into a failed edit. Test correlation, privacy and
overload. Diagnostics stay local; no telemetry service or upload feature is implied.
Hostile document limits, staged writes, failed-write recovery, stale-result rejection,
surface recreation and clean shutdown are acceptance requirements, not post-preview polish.

## Contract specifications

Use [CT-01–CT-09](../contracts.md) for concrete review packets and invariant/conformance
mapping. Shared commands do not imply shared native layouts or identical host threading.
The [E2E plan](../testing/shared-e2e.md) tests each actual UI against common behavioral cases.

SQLite clarification (R11 selected 2026-10-16): engine codec/validation means pure document
representation and semantic validation. Database mapping/connections/transactions belong to
the services storage adapter off the input path; the engine does not acquire a SQLite or
filesystem dependency. Concrete native/Wasm adapters and save lifecycle await S02 review.

## Selected native state-delivery policy

Decision 30 selects change-driven reads: native intent -> Rust command -> change summary ->
affected UI queries -> native controls. Rendering invalidation is separate. Worker results
schedule main-thread delivery, then Rust validates and produces the same update path. Native
presenters hold display snapshots only. There is no periodic polling or Rust-pushed state
callback model; wake-up scheduling must not reenter editor mutation. Native effects have
separate bounded delivery/consumption semantics so querying state cannot replay a dialog.
Exact ABI/projections/queue lifecycle remain S02 review items.

## Selected hybrid UI projections

Decision 31 refines state reads by size: small complete snapshots for affected toolbar/save/
selection groups; bounded query results plus typed changes for large collections. Collection
mirrors carry query/session identity and versions; invalidation requires bounded resync. Review
atomic changes, ordering/page boundaries and snapshot-to-delta handoff. Small snapshots need not
redraw unchanged widgets. All are presentation projections, never a native editing authority.
One-time effects and Rust-owned canvas geometry remain outside this state-transfer mechanism.

## Selected unexpected-failure policy

Decision 41 selects safe session isolation: unexpected internal failure disables affected
editing/unsafe persistence, with honest status and recovery from validated saved content.
Retain unaffected functions only when safe; no catch-and-continue mutation or tainted autosave.
Review failed-handle queries, teardown, late worker/effect invalidation and in-flight immutable
writes explicitly. Ordinary storage errors retain their separate bounded retry policy. Fatal/
uncontainable faults still require process relaunch; ABI containment is not a universal guarantee.

## Batch 2 selected integration and scheduling (decisions 95-102)

The first macOS app statically links Rust and ships/tests host and core as one matching build.
No compatibility promise to older host binaries or independent dynamic update layer. Generated
headers and compile/link/ABI checks remain mandatory; future platform linkage is separate.

Query affected small UI groups together from one state with shared update identity/native-owned
results. Collection gaps trigger bounded resync, not retained delta replay history; preserve
on-demand gallery paging and loading geometry/anchors. Identified native effects remain pending
until host acceptance; completion/failure is separate, with no duplicate presentation or reentry.

Prioritize persistence/exit-critical jobs over disposable preview work between bounded units,
with fairness and no new thread topology. Deliver completions on the main thread in bounded
slices and reschedule, preserving ordering and indivisible state updates. Export accepts a small
bounded FIFO with per-job identity/cancellation and aggregate resource caps; no parallel export
worker is implied. Exact snapshot-capture/admission timing, queue capacity, destination races and
quit behavior still need review. The policy choices are not concrete ABI or implementation approval.

## Multi-process library use (decision 116)

Different processes may edit different drawings in the same managed library. Each drawing still
has one mutable editor/process owner; initial macOS editor/Skia ownership remains on that process's
main thread. The library/catalog is no longer assumed exclusive to a single process. No tabs,
multi-editor-per-process UI, daemon or custom IPC protocol is selected by this change.

S02 must review per-document ownership, shared catalog consistency/invalidation, crash cleanup,
maintenance/deletion arbitration, stale writes and aggregate resource concerns. Proactive background
migration (117) cannot mutate a document owned by an active editor without the reviewed coordination.
Concrete mechanisms remain unapproved; process integration tests and separate native E2E are required.

## Export job lifetime and persistence (decisions 121-126)

Capture source at accepted Export command time, before the native destination effect. Jobs own
immutable snapshots and can outlive editor navigation. Preserve original source/revision and keep
status/cancellation available through reviewed native presentation. Persist job intent/source for
crash recovery using an as-yet-unapproved storage design; do not equate this with the document's
autosave journal or invent a command protocol. Exact durability/consent/recovery/retention are S02.

Serialize same-destination publications with renewed confirmation where necessary; continue safe
unrelated jobs after an individual failure. Three accepted jobs including reservations is the
count cap, alongside aggregate resource caps; its multi-process scope remains for explicit review.
Recovery cannot guess an uncertain overwrite outcome, switch to latest source content or release
owned resources based on a stale editor callback. No new worker topology is selected.

## Batch 7 ownership refinements (decisions 127-131)

Explicit contested Open first reuses/activates the verified owning document window where supported;
otherwise report in-use. No second editor/read-only mode or unsolicited background focus change.
Defer upgrades of actively owned drawings; continue eligible unrelated work. On ownership loss,
pause mutations and persistence, retain completed in-memory work, cancel unfinished interaction
and reject stale writes; no blind reacquisition/flush. Use platform advisory notifications plus
authoritative catalog validation, coalescing and lifecycle catch-up. Refuse deletion while another
process owns the drawing; rejected deletion is not deferred consent. Q44 coordinator policy remains
pending. Specify actual identity, activation acknowledgement, locks/fencing and in-flight-write
limits before implementation; no custom IPC/daemon or new thread topology is authorized.

## Batch 8 approved durable-export policies (decisions 132-138)

Use a separate SQLite job database and dedicated immutable snapshot area; exact schema source/source
representation still needs review. Accepted Export captures before its panel in bounded memory;
persist after destination confirmation, with an honest preparing/durable boundary. Automatically
resume only validated safe recovered work; pause uncertain publication/access and changed targets.
Changed destinations need renewed consent or another destination. Release terminal job-only
snapshots after safe durable reconciliation, retaining bounded outcomes and live references;
exact-source retry is unavailable after release. Source deletion explicitly confirms canceling
outstanding exports and coordinates safe cancellation before deletion; published files survive.

The count cap is three accepted active/waiting/reserved jobs PER PROCESS (Q54 B), alongside shared
resource protections. No global count/byte budget or new worker topology is chosen. Specify abandoned
job claims/reassignment, recovered admission, cross-database deletion/job lifecycle and idempotent
cleanup before code. Do not drop durable jobs, blindly retry uncertain overwrites or bypass consent.
Q44 maintenance ownership and batch 9 naming remain pending. Policies are not implementation.

## Local storage and future cloud (decision 144)

The preview has a fixed app-managed local library. Preserve a future cloud adapter boundary around
local services, provider-independent identity and coherent snapshots/change queries. Keep offline
editing/local durable save independent of network work; future remote status is separate. Do not
share live SQLite/WAL files across devices, treat process locks/local revision counters as distributed
coordination or reuse import's identity regeneration for sync replicas. Future schema/protocol review
must cover concurrent edits, deletions, retries, remote versions, authentication and encryption/key
recovery. No cloud SDK/provider/CRDT/trust model or implementation is selected. Q60 stays pending.
