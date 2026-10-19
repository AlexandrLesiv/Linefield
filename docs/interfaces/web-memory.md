# In-memory web editor contract WMP-C2

2026-10-19. **Proposal for owner approval; no production implementation authorization.**
S02-W01 is confirmed first. Base `8dbd9b1` includes merged PR6 and PR7. The isolated
synthetic candidate is evidence for this proposal, not an editor or passing browser E2E.
Owners: rust_engine semantics; designer [WMP-D3](../design/web-memory-pen.md);
rendering_performance geometry review; lead [security](../security/web-memory.md).

## Approval items and settled inputs

Approve these identified amendments together with WMP-D3 before P05-E01: W1 generated
checked Wasm calls/lifetimes; W2 single page owner and RAM/session lifecycle; W3 fixed
mapping/envelope/normalization; W4 swept-disk scene and bounded presentation; W5 accounting
reservations/failure policy. Confirmation of this task is not any of those approvals.
Owner direction on2026-10-19 retains CanvasKit for cross-platform continuity and permits
increasing the web memory budget; native Canvas may be considered later. This supersedes
the previous128MiB aggregate constraint for this web slice. W5's exact revised allowance
and enforcement limitations remain recommendations for review, not measured acceptance.
The numerical investigation supports a conservative candidate; browser/CanvasKit fidelity,
allocation high-water and release workload gates remain P05-E02 acceptance requirements.

Already selected: Rust editing authority, CanvasKit, solid opaque round pen, width1–512,
linear pressure0.10×width through full width, absent pressure full width, actual samples
only, no smoothing/filtering/tilt, atomic batches, cancellation/no partial history, one
stroke per Undo, active-interaction guards, RC1–RC11 regional representation, X right/Y
down, and decision194 history ceilings. The web CPU allowance is amended below. No persistence, native
host, selection/transform editing, extra brushes, predictions, import/export or cloud.
This packet is an additive web profile, not replacement of approved native C contracts.

## W1: exact named boundary and generated declarations

Recommend `wasm-bindgen` crate and CLI **0.2.129**, locked identically, `--target web`.
Its release and parameter-annotation support were verified in upstream docs and local
registry source; no generator executable is installed here and generated production
bindings are **unrun**. P05-E01 must generate/compile declarations and inspect actual
glue before accepting the boundary. The [upstream type override mechanism](https://wasm-bindgen.github.io/wasm-bindgen/reference/attributes/on-rust-exports/unchecked_type.html)
can emit exact parameter types but performs no validation. The checked Rust adapter is
mandatory. No serde/object packet, dispatcher opcode, C pointer or second TypeScript engine.

The following are proposed emitted method signatures and structural field shapes.
`Reply`, `State`, `ScenePage`, `Mapping`, `SceneIds` and `StrokeState` are **wasm-bindgen
generated read-only snapshot classes**, not handwritten plain DTOs. Implement named Rust
getter methods for fields and return owned boxed typed arrays for array getters. Actual
emitted declarations include `free(): void` and the generated disposal hook; no snapshot
constructor is public. The structural aliases below describe their read-only getters;
they are not a competing declaration source. Rust source/getters are the sole authoring
source and wasm-bindgen emits the .d.ts. No custom generator or serializer is selected.
No mutable editor class/raw pointer is exposed; generated wrapper internals are confined
to the bridge module. Host extracts scalar values/copies and frees each snapshot in
`finally` before issuing the next command. Arrays survive snapshot disposal as JS copies.

```ts
type Id = bigint;
type Code = "ok" | "noop" | "invalid" | "stale-owner" | "stale-session"
  | "stale-mapping" | "stale-interaction" | "sequence" | "active"
  | "unavailable" | "coordinate-overflow" | "numerical-capacity"
  | "capacity" | "stale-scene" | "disposed" | "exhausted";
type Reply = Readonly<{ code: Code; owner: Id; session: Id; interaction: Id;
  content: Id; scene: Id; mapping: Id; activeCancelled: boolean }>;
type State = Readonly<Reply & { phase: "gallery" | "ready" | "suspended";
  width: number; red: number; green: number; blue: number;
  canUndo: boolean; canRedo: boolean; strokeCount: number; cpuCharge: number;
  activeSampleLimit: number }>;
type Mapping = Readonly<Reply & { available: boolean; width: number;
  height: number; backing: number; regionX: bigint; regionY: bigint;
  localX: number; localY: number; zoom: number }>;
type ScenePage = Readonly<Reply & { geometry: Id; next: number; done: boolean;
  stroke: Id; red: number; green: number; blue: number;
  verbs: Uint8Array; points: Float32Array; weights: Float32Array }>;
export function memoryCreate(): Reply;
export function memoryEnter(owner: Id): Reply;
export function memoryRead(owner: Id): State;
export function memoryMapping(owner: Id, session: Id): Mapping;
export function memoryMetrics(owner: Id, session: Id, mapping: Id,
  sequence: Id, width: number, height: number, backing: number): Reply;
export function memorySuspend(owner: Id, session: Id, mapping: Id,
  sequence: Id): Reply;
export function memorySettings(owner: Id, session: Id,
  width: number, red: number, green: number, blue: number): Reply;
export function memoryBegin(owner: Id, session: Id, mapping: Id,
  pointer: number, x: number, y: number, pressure: number,
  hasPressure: boolean): Reply;
export function memoryAppend(owner: Id, session: Id, interaction: Id,
  mapping: Id, firstIndex: number, x: Float64Array, y: Float64Array,
  pressure: Float64Array, hasPressure: Uint8Array): Reply;
export function memoryEnd(owner: Id, session: Id, interaction: Id,
  mapping: Id, nextIndex: number): Reply;
export function memoryCancel(owner: Id, session: Id, interaction: Id,
  cause: "escape" | "blur" | "pointer-cancel" | "capture-loss" | "queue-overflow"): Reply;
export function memoryUndo(owner: Id, session: Id): Reply;
export function memoryRedo(owner: Id, session: Id): Reply;
export function memoryLeave(owner: Id, session: Id): Reply;
export function memoryScene(owner: Id, session: Id, scene: Id,
  stroke: Id, geometry: Id, offset: number): ScenePage;
export function memoryStrokeState(owner: Id, session: Id, scene: Id,
  stroke: Id): Readonly<Reply & { geometry: Id; verbs: number; terminal: boolean }>;
export function memorySceneIds(owner: Id, session: Id, scene: Id,
  after: Id): Readonly<Reply & { ids: BigUint64Array; done: boolean }>;
export function memoryDispose(owner: Id): Reply;
```

Each exported Rust function receives **JsValue for every caller-controlled argument**,
annotated with the corresponding emitted parameter type. Before coercion: verify bigint
kind/range0…u64::MAX and exact identity; numbers finite/integer/ranged as appropriate;
booleans actual booleans, strings only the five exact cancellation tokens. No ToNumber,
ToBigInt or string parsing of arguments. Direct generated u64/u32 inputs are prohibited:
their wrapping conversion can erase hostile out-of-range values before Rust validates them.
Reply numbers are closed typed discriminants, localized by stable IDs; strings above are
symbolic error IDs, never English error text for parsing. Unknown codes fail closed.

Array inputs arrive as JS references, **not Rust slices**: adapter checks intrinsic typed
array brand, attached ordinary ArrayBuffer (no SharedArrayBuffer/resizable buffer), equal
lengths1…256 and aggregate<=6,400 bytes, before allocation/copy. Use captured intrinsic
getters and copy operations, not caller properties or overridden methods; reject Proxy
and spoofed arrays without invoking accessors. One checked copy per array into reserved
scratch, then Rust validation/admission. Wrong owner/session/interaction rejects before
buffer inspection. Local wrapper checks improve ergonomics but cannot replace this guard.
This is an enforceable proposed mechanism; exact js-sys intrinsic glue needs audit in E01.

Outputs are owned copies with no Wasm memory view; [boxed numeric slice support](https://wasm-bindgen.github.io/wasm-bindgen/reference/types/boxed-number-slices.html)
copies to JS, but actual pinned glue must be inspected. One outstanding scene page,
consumed synchronously and references dropped before fetching another. `ScenePage`
arrays are immutable by contract; host mutation cannot alter Rust state. No arbitrary
host objects, callbacks or JS getters run while a mutable editor borrow is held.
Fallible allocation before mutation, no `unsafe`/unchecked slice casts, and explicit
single-thread reentrancy guard. A reentrant invocation rejects `unavailable` unchanged.
Each snapshot's scalar reply fields are getters on that same snapshot, represented by
intersection with Reply above; no nested snapshot objects. Limit **one live
snapshot** and256KiB combined allocated output arrays/snapshot storage. Reserve result
allocation before mutating; lack of a result slot throws stable symbolic
`boundary-capacity` without mutation (generated `Result<Snapshot, JsValue>` exception).
Repeated array getter calls are forbidden by bridge use; the adapter makes each copied
array getter one-shot, subsequent call throws `snapshot-consumed`. `free` releases the
snapshot allocation and result reservation; copying arrays transfers their bounded charge
to the bridge scratch pool until consumed. No next engine call until all page arrays are
consumed/dropped and snapshot freed. Host accesses after free are caught at bridge
wrapper and fail closed, never re-enter a pointer-based generated method.
These are owned-code accounting/lifetime obligations, not protection against malicious
same-origin JS retaining unlimited copies or modifying generated wrapper internals. Such
code already controls the page; do not claim a separate JavaScript security sandbox.

## W2: identities, transitions and input

One module instance, one live Rust document owner, one attached editing session on the
page main thread. No workers/atomics/shared memory/multi-client protocol. Every identity
is monotonic nonzero u64 within this module;0 means absent. Separate domains for owner,
session, interaction, mapping, content and scene. Never wrap/reuse; exhaustion rejects
without mutation. A new module resets its own domain; JS closures also bind the module
instance token, so old async completions cannot target a replacement. No automatic restart.
Before Enter reserve generation increments needed for eventual Leave/suspend, and before
Begin reserve terminal scene/content increments needed for End or Cancel. Every ordinary
Append/Metrics admission leaves those increments unused; nearing exhaustion stops further
updates by cancelling with the reserved terminal generation, then leaves input suspended.
Cleanup/Leave consume reserved IDs and remain possible. A failed Begin allocates no active
interaction. Near-exhaustion browser fault fixture must prove cancel/leave cannot be blocked
by a counter consumed by ordinary work; this is WMP-05/07, not a wrap exception.

Create allocates one blank owner in gallery; a second live create rejects `active`.
Enter from gallery creates a fresh empty history session and suspended mapping. Existing
completed strokes/settings survive. Enter while already entered is `noop`, no history
reset. Leave current session atomically cancels unfinished interaction, invalidates mapping,
clears both history stacks and releases session. Host first resolves/preflights destination
and completes fallible history API updates; Back waits for actual popstate. Only then call
Leave synchronously and install presentation. Before Leave, failed resolution/history
update preserves Rust session/history. After accepted Leave, visual failure cannot restore
history or undo semantic departure. Unexpected usable Leave rejection after browser URL
changed retains editor/Rust state with navigation-unavailable and attempts one guarded URL
reconciliation; if it fails, suspend rather than promise route rollback. No automatic repeat
of stale commands. Fatal-owner Back uses the host tombstone route without another Wasm call.
Animation cannot decide this. Check latest request generation immediately before Leave
with no intervening await; superseded destination completions cannot depart a newer session.
Repeated old-session leave rejects stale, never touches a new session.
Read in gallery remains available. Dispose releases all retained document/history/scene
state only during deliberate page teardown; duplicate dispose returns `disposed` without
releasing a newer owner. There is no user-facing reset/destructive-discard API in this slice.

WMP-D3 proposes retained RAM across Back/New, Resume wording and explicit reload/tab-close
loss. No gallery tile or durable claim. Existing sample previews never obtain editing
capability. Known temporary route cold-load behavior and navigation are defined by WMP-D3.
This is not a save/reconciliation/receipt contract. There are no pending worker writes.

Begin idle+ready captures width/color/mapping and first sample index0, returns interaction.
The host captures only the first primary canvas pointer while idle; further pointers cannot
replace it. Rust stores the integer pointer ID (Number safe integer,0…2^53−1). Append/end
identify the returned interaction rather than trusting a reused browser pointer ID. Every
host event closure also carries owner/session/mapping/interaction. Pointer A, B contact/release,
A capture loss, C begin, late A release: B ignored by acquisition; A cancel affects only A;
late A rejects and C remains active. Matching pointercancel/lostcapture/blur cancel; stale
cancel never affects C. Browser capture failure cancels the just-begun interaction.

**Proposed browser pressure adapter:** mouse and touch pressure absent (`pressure=+0`);
pen reported finite pressure treated as effective present pressure including0.
Browser `pressure=.5` may be a synthetic default on unsupported pen hardware; this adapter
cannot detect physical sensor presence and maps that value to55% width. Touch uses constant
full width to avoid that ambiguity. This adapter compromise requires approval and physical
pen evidence later; it does not change shared pressure semantics or claim sensor detection.
absent payload other than+0 rejects. Pressure range[0,1]; no fake0.5 mouse pressure. For
each move use coalesced actual events in reported order; use the enclosing event only if
coalesced list is empty. Never add both without deduplication. Split>256 events into ordered
batches; bounded acquisition queue total1,024 samples, overflow uses Cancel(queue-overflow)
which returns `capacity,activeCancelled=true` and announces capacity,
never silently drops. Pointerup ends after queued moves; it adds no synthetic zero-pressure
sample. A stationary begin/end is a dot. Predictions/tilt ignored, actual duplicates retained.

Append firstIndex must equal accepted count; indices contiguous, total<=65,536. Duplicate
or skipped current sequence cancels current unfinished stroke (`sequence`). No replay or
retry protocol exists for these synchronous calls. Validate complete batch and reserve before
append. Current invalid/numerically inadmissible/capacity batch cancels whole interaction,
completed strokes/history unchanged. Wrong/stale identities reject with `activeCancelled=false`.
End nextIndex must equal count and current mapping; commits exactly one immutable stroke
and history entry. End after cancellation rejects. Cancel does not change content revision;
scene revision changes whenever accepted visible state changes, including preview cancellation.

Width defaults8, color defaults opaque sRGB(0,0,0); finite channels[0,1]. Settings are atomic,
idle-only replacements; no history entry and no effect on prior strokes. Browser localized
field staging/IME remains presentation; Rust revalidates typed values. Undo/Redo active
rejects without queuing. Idle Undo removes last session stroke; Redo restores that exact
stroke/settings. New committed stroke clears redo. Oldest complete history entries retire
only for budget; completed visible strokes remain. No retained undo for sessions before Back.
Begin/Append/cancel/rejected End never retire earlier history or clear redo. Admission reserves
future capacity without mutating those stacks, or rejects. Only successful End atomically
clears redo, retires eligible oldest complete entries and installs new model/history state.
Begin→cancel and invalid current batch near capacity must preserve prior Undo/Redo exactly.

## W3 and W4: numerical and scene definition

See [numerical candidate/evidence](web-memory-numerics.md) for exact normalization, finite
envelope, construction/error analysis and experiment limitations. Rust owns all mapping,
stroke geometry and f32 conversion. Browser only acquires logical canvas coordinates and
executes bounded Rust scene instructions using CanvasKit. No JS shape/hit/region computation.

Metrics expected generation current; sequence starts1/increases strictly. Logical width/
height finite in[1,8192], backing finite[1,4], ceil(width×backing) and ceil(height×backing)
<=8192, product<=8,388,608 pixels checked before surface allocation. Suspended zero-size
uses explicit Suspend, not invalid Metrics. Valid changed metrics cancel unfinished work,
install mapping generation and keep completed world ink. Unchanged metrics with newer
sequence are `noop` and retain generation/interaction. Stale/invalid metrics reject unchanged.
Zoom and original stroke scale fixed1. World center region(0,0)/local(+0,+0) fixed; canvas
center(width/2,height/2) maps there. Resize changes framing, never translates stored ink.

SceneIds returns<=128 stroke IDs in paint order with preview last (reserved transient stroke
identity). ScenePage returns one stroke's<=4,096 complete path verbs, no verb split, from
integer offset; one scene revision throughout. Query mismatch returns `stale-scene`, empty
arrays/no cursor progress; rebuild after reread. Offset must equal a valid verb boundary;
no opaque lease, consuming query or internal pointer. Final page `done=true,next=0`.
Verbs:0 Move(2f32),1 Line(2),2 Conic(4+1weight),3 Close(0). Arrays have exact derived
lengths. Pages end only at **complete contour boundaries**, not midway through a disc/quad.
Stroke RGBA has alpha1, fill nonzero, antialias enabled; no outline stroke style.
Each disk and tangent quadrilateral has matching orientation. One filled path per stroke;
separate per-segment draw calls would change antialiased union coverage and are forbidden.

Each stroke has a geometry-generation token, stable while append adds complete contours
to its immutable prefix. Mapping change/reconstruction replaces token; cancellation removes
stroke. StrokeState supplies token and available verb count. Host can reuse old prefix only
with the same owner/session/stroke/geometry token and stored exact offset. Fetch tail using
current scene revision; validate full page before extending the single owned CanvasKit path,
then advance offset. A scene mismatch consumes nothing; reread token and resume only if
unchanged, otherwise delete/rebuild. End keeps geometry token and freezes path. A failed
CanvasKit append deletes that path and suspends rendering/input for bounded reconstruction;
Rust accepted samples remain. Present only complete coherent page prefixes, with subsequent
tail pending; never display an incomplete contour. New scene paint ordering is read afresh.
Append extends geometry in O(batch), no full prior-stroke rebuild per pointer event.
For this profile Rust keeps canonical samples and per-sample cumulative verb offsets
inside the charged sample record; generate bounded scene pages deterministically from
those records instead of retaining a second complete encoded path. Binary-search offsets
locate the first sample for a page; at most one preceding sample is needed for its hull.
The immutable prefix rule applies to this deterministic generated geometry as well.
Presentation keeps one active path; committed paths immutable. Rebuild after surface reset/Undo
uses<=4,096 verbs per scheduled turn;
at most one pending scene request and one dirty revision marker, never queued snapshots.
Rendering may skip obsolete preview frames, **never samples**. During full-scene rebuild
input suspended; show recovery until complete coherent scene and mapping accepted. Live
draw cost still depends on scene size: release cold/warm maximum-scene workload must be
measured before acceptance; this count bound is not an SU14 timing claim.

## W5: accounting and failure

The owner permits increasing decision194's former128MiB web aggregate. Recommend a
provisional320MiB owned-CPU operating budget:256MiB CanvasKit allowance,32MiB Rust and32MiB
JS. This is an admission/observed-capacity target, not an enforceable hard memory ceiling.
Stock CanvasKit permits growth to2GiB; a single call can overshoot the target before detection.
The extra128MiB above its initial heap is proposed headroom, not measured sufficient capacity.
One session history<=16MiB; existing32MiB cross-client ceiling is irrelevant to one client.
Count capacities/overhead and old/new/copy peaks, not only logical lengths. Subordinate
pools remain inside their category; do not add them again to the operating budget.

| Reserved category | Ceiling / policy |
| --- | --- |
| Stock CanvasKit linear heap | Initial128MiB, binary maximum2GiB; proposed observed allowance256MiB, including path cache<=16MiB, engine allocations and retained allocator space. The256MiB allowance does not change the binary maximum. |
| Rust linear heap | Initial8MiB, maximum32MiB; reserve full32MiB; within it canonical/retained samples16MiB, unfinished4MiB, scratch4MiB, metadata+runtime+allocator8MiB |
| JS acquisition, copied outputs, staging and owned headroom | 32MiB; includes acquisition1,024×40, one<=256KiB output, module loading byte arrays and simultaneous old/new bridge copies; release loading bytes before editing |

Nested policy: sample record conservative64 bytes, stroke header256, history entry128,
at most4,096 strokes (path capacity normally binds earlier). Session history retained-state
charge<=16MiB; shared visible/redo canonical samples counted once physically in Rust16MiB.
No extra16MiB physical history allocation is implied. Geometry cache<=16MiB combines any
Rust cached geometry with CanvasKit paths; each is charged inside its respective heap,
never again above the heap reservation. Browser/compiler/driver overhead is measured separately;
this is owned CPU capacity accounting, not whole-browser RSS enforcement.

Sample bytes transferred from unfinished to model reserve on End, no duplicate copy; Begin
must also reserve its eventual committed-model/history capacity. Each worst sample contributes
one circle (6 verbs,18 floats,4 weights) and<=one quad(5 verbs,8 floats):<=11 verbs,
26×4+4×4+11=131 encoded geometry bytes/sample before allocator/path overhead. A full65,536
sample stroke is8.1875MiB encoded; the4MiB Rust transient reserve cannot hold both
its4MiB canonical samples and geometry. Do **not** allocate full geometry copies:
keep samples authoritative, stage bounded pages, charge retained CanvasKit path to cache and
stop before the cache+headroom reservation is exhausted. Count ceilings do not guarantee
every65,536-sample path is admissible. Current capacity failure cancels unfinished stroke.

Rebuildability is an admission invariant: reserve all completed visible/redo stroke path
capacity even when caches are evicted. Propose per-stroke charge `65536+4*encodedBytes`
rounded upward to64KiB; sum<=16MiB, including active stroke worst reserved bytes. This
conservative4× path charge is a proposed measurement-backed acceptance assumption, not
known CanvasKit layout. Cache eviction retains reservation; no admitted document depends
on displaying more paths than can coexist within it. At Begin choose largest positive
sample ceiling N<=65,536 fitting remaining geometry/model/transient/history reservations
using131 bytes/sample and64 bytes/sample; reserve that bound before accepting sample0.
N is exposed in the state/capacity message only as technical evidence, not a user quota.
At least one sample must fit or Begin rejects. Append>N cancels atomically. End releases
unused reservation and charges actual capacities; changing N mid-interaction is forbidden.
The16MiB geometry pool alone limits a single worst-case stroke to below32,000 samples,
often fewer with other strokes. This explicitly trades maximum duration for a rebuildable
first slice. The general65,536 ceiling remains a ceiling, never a guarantee. Owner approval
must also consider the effective stroke count: every nonempty path reserves at least128KiB,
so this policy admits at most128 nonempty strokes, often fewer, despite the general4,096 ceiling.
This is an unmeasured conservative reservation, not a measured CanvasKit requirement. Approval
is requested for this charge; E02 must establish real worst-case overhead<=charge or return a
revised proposal. No sequential draw/flush workaround or unbounded GPU command queue implied.

Known capacities are counted; CanvasKit internal path storage/driver allocation is not
fully observable. Validate the stock binary's actual initial/max declarations and observed
capacity against this accounting; no custom build is a prerequisite for the next task.
Lead inspected the exact npm `canvaskit-wasm@0.41.1` standard binary without execution:
initial2048 pages=128MiB, maximum32768 pages=2GiB. SHA256:
`bd669c88bd033eaf62d673103a42231a737c6d12e4cc99f8548b2784b5772430`;
registry tarball SHA512 `gO2rNMIE0lOQ8MaarM4qNeq2zZAEknAObKP2XAKidMSAY8P5sURGdFkrx1TSdHuBFqTf5w35JqjuUzjibqkD5g==`.
Ignored artifact/inspection: `.build-cache/web-memory/canvaskit/`.
This agrees with [upstream build source](https://skia.googlesource.com/skia/+/f4aab0584dc844b1fa38e299ff1a9c1922c06a99/modules/canvaskit/compile.sh).
That initial heap exceeded the former aggregate once Rust was included. The owner's increase
removes that initial-footprint conflict; it does not establish release workload feasibility.
Use pinned stock0.41.1 under the proposed operating budget, subject to E01 validating actual
startup, heap instrumentation and graphics allocation. No native Canvas switch is selected.
Observe linear-memory buffer capacity before/after allocating CanvasKit calls and at bounded
frame/rebuild boundaries. No per-sample production logging. If CanvasKit exceeds256MiB or
owned CPU exceeds320MiB, stop input/presentation, cancel unfinished interaction through Rust,
preserve completed Rust RAM/history and retire disposable rendering resources. Display the
unavailable state; stale pixels must not imply that new accepted work was presented.
An individual allocation can overshoot before observation; do not promise pre-allocation
enforcement inside CanvasKit. Deleting paths cannot shrink linear memory. Do not automatically
resume, restart the engine or reload/discard the drawing after this budget failure.
Keep this budget-failure state suspended for the page lifetime: Back remains available,
but Retry and Resume cannot restart rendering or replace the retained Rust owner. Re-entering
the temporary route shows the same unavailable state. Accepted Back still follows W2's
history-departure rule. This is distinct from recoverable context loss. WMP-05/09 must cover
budget excess → Back → Resume/Forward and prove no restart, blank replacement or false recovery.
E01 must verify access to pinned heap capacity and safe handling; unavailable instrumentation or an
insufficient allowance returns measured options for review. A hard256MiB CanvasKit ceiling
would require a separately reviewed mechanism/build; it is not claimed here.
This operating policy is **not hard RSS control**. Count physical memory once: paths inside its linear
heap consume that heap's live category share, and remaining retained heap capacity is
headroom, not an additional full heap charge. Include JS copied arrays separately. E01/E02
must measure pinned release heap high-water/retained path peaks and
validate reservations; insufficient headroom fails the proposal's acceptance, not permission
to increase caps. Cache eviction calls `.delete()`; `rewind()` retains storage. No eviction
of accepted drawing state. When history eviction cannot free enough eligible bytes, reject
admission; do not clear protected content to render. Rendering page/query overhead stays
bounded even while semantic admission stopped.

Surface budget separately proposed96MiB graphics/backing reservation (one nominal RGBA8
surface<=32MiB, same-size presentation allowance,32MiB attachment/cache headroom), outside the320MiB CPU target and not a
browser RSS guarantee. Retire surface before replacement; no doubled live surfaces. Browser/
driver overhead and real framebuffer format require measured headroom. Explicit context
attributes depth:false, antialias:false, stencil:true; pinned default depth allocation must
not slip in. Stencil attachment padding/cache must fit graphics headroom; otherwise fail
initialization and return revised measured proposal. No silent DPR reduction
or software fallback. Explicit audited CanvasKit context/surface constructors are required:
`MakeWebGLCanvasSurface` may internally fall back and replace canvas. Rendering reviewer
must approve pinned calls and memory measurement in E01 before enabling them.

Surface/context loss: stop admission, cancel unfinished work, preserve accepted Rust RAM and
history; delete invalid resources, bounded rebuild on restoration, resume only fresh mapping.
Initialization/asset failure before owner exists changes no drawing. Panic/trap/OOM or uncertain
Wasm owner integrity: fail closed, stop all commands, keep fatal tombstone, no synthetic success
or automatic blank replacement. RAM cannot be promised recoverable after a fatal engine fault.
Ordinary allocation rejection returns typed capacity and preserves completed content. Browser
teardown is explicit disposal; no background process/storage writes. Local asset/CSP audit,
redaction, adversarial checks and independent approval are in the security packet.

## Required E2E evidence and ownership

CT-01–04/06–09; INV-01–05/08/09/11; SU-01–04/07/13–18/20. rust_engine owns semantic
expectations below, web implementer drives actual browser UI with real Wasm+CanvasKit,
designer visible/focus/localized outcomes, rendering specialist scene/workload, independent
reviewer evidence labels. No new unit/property/bridge-only/developer-tool suites.

| Case | Trigger/state → outcome/invariant |
| --- | --- |
| WMP-01 | Dot, sharp turn, duplicate center/changed pressure, alternating pressure → same-winding swept disk; full-width absent pressure; no seams, immutable old color/width |
| WMP-02 | A/B/lostcapture/C/lateA; Escape, blur, resize, Back → only matching unfinished work disappears, no history; fields/IME keep priority |
| WMP-03 | Undo during input rejects; completed stroke Undo/Redo as one; Back/Resume has retained ink and empty history; no save claim |
| WMP-04 | Bound±adjacent value, batch256/257, sample65,536/65,537, invalid pressure/sequence → current batch atomic cancel; stale unrelated event does not cancel current work |
| WMP-05 | Capacity including Begin→cancel/invalid batch with full history, context loss/recovery, asset failure, stale scene page, disposed owner, trapped engine, generation exhaustion → declared state/failure, no accepted artwork/history silently replaced; terminal cancellation/leave still works |
| WMP-06 | en/uk, field staging, theme changes, reduced motion, gallery/history → unchanged navigation/AX, honest RAM lifecycle, artwork colors unchanged |
| WMP-07 | Huge bigint/u32-like Number, fake/detached/shared array, mismatched lengths, reentrancy → reject before coercion/copy/mutation; reviewed browser-only fault facility, no production fault endpoint |
| WMP-08 | Offscreen crossing segment, thick offscreen centerline, near containment, subpixel/min pressure, projected extreme → visible clipping/round geometry; semantic and screenshot expectations both |
| WMP-09 | Cold/warm bounded maximum scene, cancellation during rebuild, cache eviction, repeated resize/context recovery → bounded queues/live resources; report actual release timings/heap, no fabricated physical latency |
| WMP-10 | Failed loader/history write, delayed Back popstate, superseded route request, renderer fault after accepted Leave → preflight before Leave; no history reset on failed preflight, no post-Leave false restoration, stale completion cannot navigate newer session |

The isolated diagnostic is not any row's browser pass. Exact release revision/browser/device,
discovered E2E IDs, results and ignored artifacts belong with each implementing task. No main
merge, product adoption or remaining task confirmation is granted by this document.
