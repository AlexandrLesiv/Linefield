# In-memory web editor contract WMP-C2

2026-10-19. **Owner-approved contract choices; S02-W01 integrated and P05-E01 separately confirmed.**
[P05-E01](../../tasks/P05-E01.md) implements only the empty-owner foundation from verified
PR #9 merge `c28f56b`; its task records current implementation and evidence status. Pen,
history and pan/zoom implementation remain P05-E02 scope requiring separate confirmation. The isolated
synthetic candidate is evidence for this proposal, not an editor or passing browser E2E.
Owners: rust_engine semantics; designer [WMP-D3](../design/web-memory-pen.md);
rendering_performance geometry review; lead [security](../security/web-memory.md).

## Approval items and settled inputs

The owner approved review choices G1–G4, W1–W4 and C1–C3, with C4 explicitly clarified
below. Those review labels are distinct from this document's W1–W5 section labels.
G1 requires actual editor pan/zoom in this slice; fixed-view-only is rejected. G2 approves
screen/surface limits, G3 precision/normalization policy and G4 swept-disk round geometry.
W1–W4 approve generated checked bindings, one main-thread Rust owner, bounded batches and
the reviewed security direction. C1 requires memory-based long strokes without a65,536
lifetime-sample cap; C2 approves oldest whole-history retirement; C3 approves context
recovery preserving accepted RAM. The owner subsequently approved N1/A1/R1 against
reviewed commit51d9345: exact arithmetic/projection, typed pan/index/presentation additions
and coherent renderer/accounting mechanisms below. No unspecified ABI is approved.
Owner direction on2026-10-19 retains CanvasKit for cross-platform continuity and permits
increasing the web memory budget; native Canvas may be considered later. This supersedes
the previous128MiB aggregate constraint for this web slice. The owner subsequently approved
the revised320MiB owned-CPU operating budget (CanvasKit256,Rust32,JS32) and separate96MiB
graphics target. C4 clarifies **soft monitoring targets**, not admission cutoffs: crossing
320MiB CPU, a category share or96MiB graphics does not itself stop editing. First reclaim
disposable resources/reduce optional rendering work; reject only on actual resource failure.
Budget approval is not runtime acceptance and creates no reliable OS/browser warning guarantee.
Owner also approved memory-based admission without a fixed document stroke quota: actual
Rust allocation accounting, observed CanvasKit heap, measured renderer estimates and disposable
cache eviction. N1/A1/R1 approve the concrete mechanisms; actual runtime evidence remains
required. Material deviations return for review rather than inheriting this approval.
Owner choices1A/2A retain the temporary drawing, accepted settings and both Undo/Redo
stacks across gallery Back/Resume. History belongs to the page-lived document; editing
session attachment generations do not define or reset its lifetime. This approved
lifecycle does not authorize production implementation or imply survival after page loss.
Owner choices3A/4B/5A approve browser-reported pen pressure, constant-width mouse ink,
no finger drawing with browser touch gestures allowed, and native width/color controls
for now (width8, opaque black defaults). These exact choices are settled. Implementation
evidence gaps are identified below; do not reopen the selected product choices.
The numerical investigation supports a conservative candidate; browser/CanvasKit fidelity,
allocation high-water and release workload gates remain P05-E02 acceptance requirements.

Already selected: Rust editing authority, CanvasKit, solid opaque round pen, width1–512,
linear pressure0.10×width through full width, absent pressure full width, actual samples
only, no smoothing/filtering/tilt, atomic batches, cancellation/no partial history, one
stroke per Undo, active-interaction guards, RC1–RC11 regional representation, X right/Y
down, and the history retirement target with the owner-approved H1 exception. The web CPU allowance is amended below. No persistence, native
host, selection/transform editing, extra brushes, predictions, import/export or cloud.
This packet is an additive web profile, not replacement of approved native C contracts.

## Owner-approved technical decisions

P1, H1 and S1–S4 were approved against the797ffb1 recommendation batch. On2026-10-19
the owner explicitly stated, “I approve N1, A1 and R1.” This approves the technical packet
at51d9345 and the choices below. The owner subsequently confirmed P05-E01 separately and
merged PR #9. Contract approval does not accept future runtime evidence or authorize agent merges.

| Approved choice | Selected mechanism | Remaining evidence gate |
| --- | --- | --- |
| N1 — arithmetic and finite projection | Fixed20×u64 exact integer/rational input and captured-base pan normalization, nearest-even checked carry; exact regional painted-bounds classification before bounded relative projection. See numerical companion for candidate capacity, operation order, corpus and repaired counterexample. | More arithmetic than ordinary f64 division; no global Number flattening or new package. Release Wasm latency and CanvasKit fringe/geometry E2E still required. |
| A1 — new typed boundary | Checked u64/bigint cumulative counts/cursors; named pan/step APIs and Rust-issued presentation acknowledgement as specified below. | Additional generation/readiness bookkeeping prevents stale frames from enabling ink; no raw memory views, generic protocol or TypeScript editing engine. |
| R1 — rendering working set | One full-frame staging surface, whole strokes processed in paint order, coherent committed image plus complete active path; optional cache separate from mandatory single-stroke working resources. | Extra image/surface backing may exceed96MiB soft target. Requires measured path/snapshot/draw peaks and latency; no fixed stroke quota or partial-frame publication. |

These choices have owner disposition after numerical and independent review.
Measurements, generated binding audit, browser E2E and actual
screen review are implementation acceptance work, not claims made by this packet. The separately
confirmed P05-E01 task records those checks; this document alone grants no implementation authority.

## W1: exact named boundary and generated declarations

Owner-approved binding direction uses `wasm-bindgen` crate and CLI **0.2.129**, locked identically, `--target web`.
Its release and parameter-annotation support were verified in upstream docs and local
registry source. P05-E01 generates production declarations and inspects actual glue for its
ten-export subset; see that task for exact-build acceptance. The remaining methods below
are contract specifications, not implemented exports. The [upstream type override mechanism](https://wasm-bindgen.github.io/wasm-bindgen/reference/attributes/on-rust-exports/unchecked_type.html)
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
  content: Id; scene: Id; mapping: Id; presentation: Id; activeCancelled: boolean }>;
type State = Readonly<Reply & { phase: "gallery" | "ready" | "suspended";
  width: number; red: number; green: number; blue: number;
  canUndo: boolean; canRedo: boolean; canBeginInk: boolean; strokeCount: bigint; cpuCharge: number }>;
type Mapping = Readonly<Reply & { available: boolean; width: number;
  height: number; backing: number; regionX: bigint; regionY: bigint;
  localX: number; localY: number; zoom: number }>;
type ScenePage = Readonly<Reply & { geometry: Id; next: bigint; done: boolean;
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
export function memoryPresented(owner: Id, session: Id, presentation: Id,
  mapping: Id, content: Id): Reply;
export function memorySettings(owner: Id, session: Id,
  width: number, red: number, green: number, blue: number): Reply;
export function memoryBegin(owner: Id, session: Id, mapping: Id,
  pointer: number, x: number, y: number, pressure: number,
  hasPressure: boolean): Reply;
export function memoryAppend(owner: Id, session: Id, interaction: Id,
  mapping: Id, firstIndex: bigint, x: Float64Array, y: Float64Array,
  pressure: Float64Array, hasPressure: Uint8Array): Reply;
export function memoryEnd(owner: Id, session: Id, interaction: Id,
  mapping: Id, nextIndex: bigint): Reply;
export function memoryCancel(owner: Id, session: Id, interaction: Id,
  cause: "escape" | "blur" | "pointer-cancel" | "capture-loss" | "queue-overflow"): Reply;
export function memoryPanBegin(owner: Id, session: Id, mapping: Id,
  pointer: number, x: number, y: number): Reply;
export function memoryPanUpdate(owner: Id, session: Id, interaction: Id,
  baseMapping: Id, sequence: Id, x: number, y: number): Reply;
export function memoryPanEnd(owner: Id, session: Id, interaction: Id,
  baseMapping: Id, nextSequence: Id): Reply;
export function memoryPanStep(owner: Id, session: Id, mapping: Id,
  direction: "left" | "right" | "up" | "down"): Reply;
export function memoryZoomStep(owner: Id, session: Id, mapping: Id,
  direction: "in" | "out"): Reply;
export function memoryUndo(owner: Id, session: Id): Reply;
export function memoryRedo(owner: Id, session: Id): Reply;
export function memoryLeave(owner: Id, session: Id): Reply;
export function memoryScene(owner: Id, session: Id, scene: Id,
  stroke: Id, geometry: Id, offset: bigint): ScenePage;
export function memoryStrokeState(owner: Id, session: Id, scene: Id,
  stroke: Id): Readonly<Reply & { geometry: Id; verbs: bigint; terminal: boolean }>;
export function memorySceneIds(owner: Id, session: Id, scene: Id,
  after: Id): Readonly<Reply & { ids: BigUint64Array; done: boolean }>;
export function memoryDispose(owner: Id): Reply;
```

The obsolete `activeSampleLimit` is removed: there is no lifetime sample-count quota.
Owner-approved A1 selects checked u64/bigint cumulative sample indices, stroke
counts and verb cursors exactly as shown above; bounded per-page array lengths remain Number.
Pan/step signatures in this table are part of approved A1; actual generated source remains
unbuilt and must match the approved contract. Never wrap/truncate an index, silently split one stroke
into several Undo entries, or treat65,537 samples as intrinsically invalid. Mathematical
counter exhaustion is a representability failure, not a product stroke-duration limit.

Each exported Rust function receives **JsValue for every caller-controlled argument**,
annotated with the corresponding emitted parameter type. Before coercion: verify bigint
kind/range0…u64::MAX and exact identity; numbers finite/integer/ranged as appropriate;
booleans actual booleans; strings must match the exact per-argument literal set: five
cancel causes, four pan directions, or in/out zoom. Reject non-string values without coercion. No ToNumber,
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
session, interaction, mapping, content, scene and proposed presentation. Never wrap/reuse; exhaustion rejects
without mutation. A new module resets its own domain; JS closures also bind the module
instance token, so old async completions cannot target a replacement. No automatic restart.
Before Enter reserve generation increments needed for eventual Leave/suspend, and before
Begin reserve terminal scene/content/presentation increments needed for End or Cancel. Every ordinary
Append/Metrics admission leaves those increments unused; nearing exhaustion stops further
updates by cancelling with the reserved terminal generation, then leaves input suspended.
Cleanup/Leave consume reserved IDs and remain possible. A failed Begin allocates no active
interaction. Near-exhaustion browser fault fixture must prove cancel/leave cannot be blocked
by a counter consumed by ordinary work; this is WMP-05/07, not a wrap exception.

Create allocates one blank owner in gallery; a second live create rejects `active`.
Enter from gallery creates a fresh input attachment session and suspended mapping. Existing
completed strokes, accepted settings and both history stacks survive unchanged. Enter while
already entered is `noop`; neither form resets history. Leave current session atomically
cancels unfinished interaction, invalidates mapping and releases the input attachment;
document/settings/Undo/Redo remain retained by the page-lived owner. Host first resolves/preflights destination
and completes fallible history API updates; Back waits for actual popstate. Only then call
Leave synchronously and install presentation. Before Leave, failed resolution/history
update preserves Rust session/history. After accepted Leave, visual failure cannot undo
semantic departure; the retained history needs no restoration. Unexpected usable Leave rejection after browser URL
changed retains editor/Rust state with navigation-unavailable and attempts one guarded URL
reconciliation; if it fails, suspend rather than promise route rollback. No automatic repeat
of stale commands. Fatal-owner Back uses the host tombstone route without another Wasm call.
Animation cannot decide this. Check latest request generation immediately before Leave
with no intervening await; superseded destination completions cannot depart a newer session.
Repeated old-session leave rejects stale, never touches a new session.
Read in gallery remains available. Dispose releases all retained document/history/scene
state only during deliberate page teardown; duplicate dispose returns `disposed` without
releasing a newer owner. There is no user-facing reset/destructive-discard API in this slice.

Owner-approved retention across Back/Resume includes drawing/settings/Undo/Redo and viewport center/zoom (P1); WMP-D3
defines Resume wording and explicit reload/tab-close loss. No gallery tile or durable claim. Existing sample previews never obtain editing
capability. Known temporary route cold-load behavior and navigation are defined by WMP-D3.
This is not a save/reconciliation/receipt contract. There are no pending worker writes.

Begin idle+ready+acknowledged-presentation captures width/color/mapping and first sample index0, returns interaction.
The host admits only mouse and pen input for ink and captures only the first primary
eligible canvas pointer while idle; further pointers cannot
replace it. Rust stores the integer pointer ID (Number safe integer,0…2^53−1). Append/end
identify the returned interaction rather than trusting a reused browser pointer ID. Every
host event closure also carries owner/session/mapping/interaction. Pointer A, B contact/release,
A capture loss, C begin, late A release: B ignored by acquisition; A cancel affects only A;
late A rejects and C remains active. Matching pointercancel/lostcapture/blur cancel; stale
cancel never affects C. Browser capture failure cancels the just-begun interaction.
Finger/touch input creates no Rust begin/append/end command and is not captured for ink.
Preserve browser touch gestures: no canvas-wide `touch-action:none` or touch-event default
prevention merely to protect drawing. A touch contact/release itself must not cancel an
active matching pen interaction. If browser gesture takeover produces matching pointercancel,
capture loss, focus loss or an accepted mapping change, use the existing cancellation path;
no partial stroke/history and no invented cancellation from an unrelated touch event.
Touch pressure/drawing semantics are future scope, not implemented by this slice.

**Owner-approved P05-E02 mouse/pen release ordering exception:** a trusted primary mouse or pen
`lostpointercapture` on the canvas, matching the active pointer and its down timestamp,
with `buttons=0` and `button=-1`, freezes that interaction awaiting its genuine release.
This narrowly normalizes the observed Wacom and mouse loss-before-up ordering. The owner
reported the same trusted zero-button mouse loss immediately before its genuine up after
14 accepted samples; the mouse extension keeps the existing completion/cancellation policy.
The event device kind must equal the admitted mouse/pen contact; no touch extension. It does not infer
End from capture loss or pressure. Keep one existing contact/prefix, no queued samples,
polling or elapsed-time expiry. Repeated matching loss is idempotent; zero-button hover
adds nothing. A trusted matching primary mouse/pen up (`buttons=0`, `button=0`), not older than
the contact down and with unchanged owner/session/mapping/interaction, calls the ordinary
Rust End once. Other capture losses retain cancellation behavior.

While pending, pressed movement, conflicting capture, pointercancel, Escape, focus loss,
hidden page, mapping invalidation and navigation use the existing Rust cancellation path.
A fresh eligible canvas down first cancels the pending contact, then submits that same
event as a normal fresh Begin; it must not consume the next stroke merely to recover.
Unrelated releases cannot resolve the pending contact. Clear the old host contact before
Cancel/End, fence recognizable stale timestamps, and never reuse a pending closure for
a fresh interaction. DOM pointer IDs have no contact-generation field: arbitrarily
mislabelled old events with fresh timestamps are not distinguishable; ordinary browser
down/up contact ordering remains a host assumption. With no further event, the provisional
stroke remains frozen until an explicit exit; Escape and Back remain available, with a
localized nonblocking explanation. Rust keeps settings/history guarded while active.

WMP-02/CT-02/INV-04 edge-case ownership: the P05-E02 implementer owns actual-browser
trusted loss-before-up evidence with a release delayed beyond 32 ms, preserved visible
prefix and one Undo; hover/repeated loss/no growth; wrong-pointer/old/untrusted release;
fresh same-pointer down then late old release (including reused mouse ID1); wrong-device
release against pending mouse; pressed movement, focus, Escape, Back and
remap cancellation followed by fresh ink. Independent review checks identity fencing and
bounded state; designer reviews pending/exit states in en/uk including narrow layouts.
Synthetic event conditions are labelled separately from browser-generated trusted input.
SEC-02/03 remain unchanged at the Wasm boundary: no new command, transport, allocation
authority or payload. Host diagnostics remain bounded metadata only, without samples.

**Owner-approved browser pressure adapter (3A):** mouse pressure absent (`pressure=+0`);
pen reported finite pressure treated as effective present pressure including0.
Browser `pressure=.5` may be a synthetic default on unsupported pen hardware; this adapter
cannot detect physical sensor presence and maps that value to55% width. Physical pen
evidence remains required; approval does not change shared pressure semantics or claim
sensor detection. Absent payload other than+0 rejects. Pressure range[0,1]; no fake0.5 mouse pressure. For
each move use coalesced actual events in reported order; use the enclosing event only if
coalesced list is empty. Never add both without deduplication. Split>256 events into ordered
batches; bounded acquisition queue total1,024 samples, overflow uses Cancel(queue-overflow)
which returns `capacity,activeCancelled=true` and announces capacity,
never silently drops. Pointerup ends after queued moves; it adds no synthetic zero-pressure
sample. A stationary begin/end is a dot. Predictions/tilt ignored, actual duplicates retained.

Append firstIndex must equal accepted count; indices contiguous with checked arithmetic,
without a fixed lifetime sample-count ceiling. Duplicate
or skipped current sequence cancels current unfinished stroke (`sequence`). No replay or
retry protocol exists for these synchronous calls. Validate complete batch and reserve before
append. Current invalid/numerically inadmissible/capacity batch cancels whole interaction,
completed strokes/history unchanged. Wrong/stale identities reject with `activeCancelled=false`.
End nextIndex must equal count and current mapping; commits exactly one immutable stroke
and history entry. End after cancellation rejects. Cancel does not change content revision;
scene revision changes whenever accepted visible state changes, including preview cancellation.

Owner-approved controls (5A) use native width controls and the browser-owned opaque sRGB
color picker for now; width defaults8 and color defaults black sRGB(0,0,0).
Width domain1–512 and finite color channels[0,1] remain Rust-validated. Settings are atomic,
idle-only replacements; no history entry and no effect on prior strokes. Browser localized
field staging/IME remains presentation; Rust revalidates typed values. Undo/Redo active
rejects without queuing. Idle Undo removes the latest eligible stroke from the page-lived
document history, including strokes completed before Back; Redo restores that exact
stroke/settings. New committed stroke clears redo. Oldest complete history entries retire
only for budget; completed visible strokes remain. Undo-all→Back→Resume retains Redo and
restores its eligibility from the retained stack; a blank document is not a history reset.
Begin/Append/cancel/rejected End never retire earlier history or clear redo. Admission reserves
future capacity without mutating those stacks, or rejects. Only successful End atomically
clears redo, retires eligible oldest complete entries and installs new model/history state.
Begin→cancel and invalid current batch near capacity must preserve prior Undo/Redo exactly.

**Owner-approved H1 oversized-history policy:** retain the newest whole operation even
above16MiB after retiring eligible older entries;16MiB is a retirement target, not a
reason to reject that memory-admitted stroke. Do not split it, commit without Undo,
reinterpret retained-state bytes as metadata only, or make its first Undo discard Redo.
The exception follows that newest entry through Undo/Redo and Back/Resume. A subsequent
successful commit may retire it under the normal oldest-entry policy; failed/cancelled
work cannot. Cover a newest stroke>16MiB through End→Undo→Redo→Back→Resume.

## W3 and W4: numerical and scene definition

See [numerical candidate/evidence](web-memory-numerics.md) for exact normalization, finite
envelope, construction/error analysis and experiment limitations. Rust owns all mapping,
stroke geometry and f32 conversion. Browser only acquires logical canvas coordinates and
executes bounded Rust scene instructions using CanvasKit. N1 selects a2-logical-pixel
conservative culling guard around the viewport; its AA/clip adequacy requires pinned-renderer
E2E. The numerical envelope supports guards up to4096 conditionally, not a selection of that
larger value or proof of actual raster fringe. No false-negative culling or silent tolerance
increase is permitted. No JS shape/hit/region computation.

Metrics expected generation current; sequence starts1/increases strictly. Logical width/
height finite in[1,8192], backing finite[1,4], ceil(width×backing) and ceil(height×backing)
<=8192, product<=8,388,608 pixels checked before surface allocation. Suspended zero-size
uses explicit Suspend, not invalid Metrics. Valid changed metrics cancel unfinished work,
install mapping generation and keep completed world ink. Unchanged metrics with newer
sequence are `noop` and retain generation/interaction. Stale/invalid metrics reject unchanged.
Original stroke scale remains1; selection scaling remains excluded. Editor pan/zoom is
required (G1), with the already selected zoom range[0.1,8]. Initial viewport center is
regional world0 and initial zoom1, then Rust owns accepted center/zoom independently of
samples. Canvas center(width/2,height/2) maps to that center. Resize preserves accepted
viewport center/zoom and changes framing, never stored ink. Browser page gestures remain
distinct from editor viewport commands and cannot silently mutate Rust's mapping.

Recommend named checked `memoryPanBegin`, `memoryPanUpdate`, `memoryPanEnd` and shared
Cancel, plus `memoryPanStep` and `memoryZoomStep` for the owner-approved P1 UI step origins. These are **owner-approved interface contracts**, not emitted/generated source.
Pan captures center/zoom/start point and an interaction token; ordered updates carry that
token, captured mapping generation and current canvas point. Derive every preview from
`capturedCenter−(current−start)/capturedZoom`, not accumulated rounded deltas. Each accepted
preview gets a new presentation mapping/scene generation; no new ink while pan is active.
A1 starts updates at sequence1; every accepted update requires the next exact sequence,
then advances it with checked u64 arithmetic. Submit a changed final pan pointer position
as Update before End; End supplies that exact next sequence and adds no point itself. Base mapping identifies the captured transform even after
preview mapping changes; current presentation mapping is not substituted for it. Wrong/stale
tokens reject unchanged; a malformed current update cancels to the captured view. A repeated
or skipped current sequence cancels, matching ink ordering. End retains accepted viewport,
no document Undo. Cancel/Escape/blur/capture loss restores
captured viewport; a system remap cancels pan before installing new metrics. Stale tokens
or wrong sequences cannot alter a newer pan/ink interaction. Reserve terminal generations
before Begin. Active ink rejects pan/zoom without queuing or forcing cancellation.

Owner-approved P1 uses center-anchored1.25 zoom button steps: Rust selects next zoom within
[0.1,8], reaches boundary explicitly and no-ops at that boundary. This approved discrete stepping
policy is distinct from silently clamping an invalid raw factor. Zoom-in computes one nearest-even binary64 multiplication by1.25; zoom-out computes
one nearest-even division by1.25; an outward step reaching/crossing an endpoint selects that
explicit binary64 endpoint. No accumulated transform of samples. Any later arbitrary-factor
API must validate resulting zoom and define its anchor explicitly. Initial browser touch/wheel gestures remain browser-owned, not Rust pan/zoom
commands. P1 approves Space-drag, focused Arrow keys at40 CSS pixels per step, and viewport
retention across Back/Resume. A1's direction enum makes Rust derive ±40/zoom; browser code
sends the key intent, never a precomputed world delta. Right/down increase view-center X/Y. Exact typed signatures remain engineering review items. Native field/IME handling retains priority. Exact inverse division/normalization,
anchored zoom arithmetic and visible painted envelope must be revalidated as specified in
the numerical companion before implementation; old zoom1 diagnostics do not supply that evidence.

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

**Owner-approved R1 — whole-stroke streaming and coherent presentation.**
Each stroke has a geometry-generation token, stable while append adds complete contours
with immutable prefix. Mapping change/reconstruction replaces it; cancellation removes the
preview. StrokeState supplies token and available verb count. Rust keeps canonical samples
and cumulative verb offsets, generates bounded pages deterministically and binary-searches
the first sample for a page (at most one preceding sample for its hull). No second full
encoded geometry copy. A stale scene query consumes nothing; reread and reuse prefix only
when module/owner/session/stroke/geometry and exact cursor still match.

Pinned CanvasKit0.41.1 uses PathBuilder.addVerbsPointsWeights for complete-contour growth,
snapshot() for an immutable active Path and detach() for a completed Path. Path itself is
immutable. Validate each page before extending the builder. Geometry transfer stays<=4,096
verbs per scheduled turn; this does **not** bound snapshot, allocation, tessellation or drawPath
time. These calls are nonpreemptible and require release measurements. No O(batch) total
preview-cost promise follows from incremental geometry generation.

Keep one complete committed-scene image and draw the complete active-stroke snapshot over
it. Background key: module/owner, content revision, mapping, surface generation and geometry
algorithm/style version. Active preview additionally carries interaction/geometry generation
and accepted prefix cursor. Appending samples leaves an unchanged committed background valid.
Cancellation removes only preview. If the renderer/context remains usable, restore the
already-held coherent committed image without requiring a new allocation. A lost/failed
renderer may instead show display-unavailable while the independent Rust owner retains work. Successful End may append the complete stroke once to matching
staging before publishing its new snapshot. Rendering failure cannot undo a Rust commit. Pan cancellation restores the captured Rust viewport;
if its old image was released, rebuild and acknowledge that view before fresh ink.

Undo/Redo, viewport changes, context recovery and cache misses rebuild in paint order into
one ordinary full-frame offscreen staging surface. Build/draw/release one full stroke at a
time, or reuse a complete optional cached path; never require all paths resident. Fill each
stroke once, never separate segments. Retain the last coherent image during reconstruction;
publish only a complete image matching current content/mapping/surface generations. A late
final frame after resize or viewport change is discarded. One rebuild request and one latest
dirty marker; no queue of snapshots or stale builds. The retained frame is an updating presentation, never misrepresented as the current accepted
mapping. Approved R1 reuses memory.loading in the existing fixed canvas status overlay,
marks the canvas busy and preserves focus/unsaved disclosure. No modal, layout shift, fake
percentage, failure copy or Retry for ordinary progress. Keep Back/pan/zoom/cancel operable;
this status cannot intercept their input. Rejected ink requires release and fresh contact
after acknowledgement, never deferred input. Actual failure uses the approved failure state.

A1 adds a Rust-issued presentation token and named memoryPresented acknowledgement.
Rust invalidates readiness and advances this token on accepted committed-content/mapping
change, Enter, Suspend or surface invalidation. The adapter must Suspend before replacing
or losing a surface, including same-size replacement; resuming metrics issues a fresh token.
A complete publication acknowledges exact owner/session/presentation/mapping/content with
no intervening asynchronous work. Old surface callbacks therefore cannot unlock a new one,
even with identical dimensions/content. Module identity remains bound in the host closure.
Rust returns canBeginInk only when current acknowledgement, phase and interaction guards
all permit it. An acknowledgement is accepted only for an attached, nonsuspended current
presentation; it cannot resume a suspended/detached owner. Stale acknowledgement rejects unchanged; it neither mutates artwork/history
nor creates a viewport interaction. Active-prefix Append changes scene/geometry only and does
not invalidate the committed background's token or stop already-admitted ink. Reserve terminal
presentation increments with other generations. This is an owner-approved addition,
not a security proof against hostile same-origin JavaScript.

R1 explicitly permits temporarily withholding fresh ink until displayed mapping/content is current. Viewport requests may supersede a
rebuild; Back/cancel remain available. System remap or actual renderer failure cancels
unfinished ink through Rust before invalidating mapping. Preserve completed Rust state and
history. Do not transform stale raster content as an unreviewed pan shortcut. If release
measurements cannot meet interactive expectations, return findings before adopting tiles,
workers or per-segment drawing. This proposal adds no such mechanism. P1 approval alone does not approve arbitrary freezes;
measure accepted-view publication delay and time to fresh ink under repeated pan supersession.

## W5: accounting and failure

The owner approved replacing decision194's former128MiB web aggregate with a
320MiB owned-CPU **soft monitoring target**:256MiB CanvasKit,32MiB Rust and32MiB
JS. These shares guide observation/reclamation, not admission cutoffs or enforced ceilings.
Stock CanvasKit permits growth to2GiB; a single call can overshoot the target before detection.
The extra128MiB above its initial heap is proposed headroom, not measured sufficient capacity.
The page-lived document uses a16MiB history retirement target with the approved newest-entry
exception (H1); the former32MiB cross-client ceiling is irrelevant to one client.
Count capacities/overhead and old/new/copy peaks, not only logical lengths. Subordinate
pools remain inside their category; do not add them again to the operating budget.

| Observed category | Monitoring target / policy |
| --- | --- |
| Stock CanvasKit linear heap | Initial128MiB, binary maximum2GiB; observed target256MiB, including paths, engine allocations and retained allocator space. The target does not change the binary maximum. |
| Rust linear heap | Monitoring share32MiB; initial8MiB is an unverified build recommendation. No32MiB linker maximum is approved. Actual declared maximum/growth/allocator behavior must be reported with the runtime build. Canonical, unfinished, scratch and metadata capacities are observed, not forced into old16/4/4/8 quotas. |
| JS acquisition, copied outputs, staging and owned headroom | Monitoring share32MiB; includes bounded acquisition1,024×40, one<=256KiB output, module loading byte arrays and old/new bridge copies. Release loading bytes before editing. |

Owner approved memory-based admission rather than the proposed128-stroke restriction.
Withdraw the fixed64KiB-plus-multiplier per-path reservation and the4,096-stroke count ceiling.
Approved policy direction: charge Rust records/containers by actual allocated capacity,
including headers, alignment, spare capacity and allocation overhead established by the build.
The earlier64-byte sample/256-byte header/128-byte history figures are sizing estimates,
not substitutes for actual layout/capacity accounting. Page-lived history retained-state
charge targets16MiB with the H1 newest-entry exception; shared visible/redo
canonical samples counted once physically in Rust's observed capacity.
No extra16MiB physical history allocation is implied. R1 treats16MiB as the optional
geometry/path-cache target. Required active builder/snapshot or one-stroke reconstruction
working set is separate and may exceed it; no new per-stroke cap. Count each allocation inside
its containing heap once, never again above that heap's observed capacity. Browser/compiler/driver overhead is measured separately;
this is owned CPU capacity accounting, not whole-browser RSS enforcement.

Sample bytes transfer from unfinished to model accounting on End without a duplicate copy.
Reserve terminal commit/cancel metadata before admitting an interaction, then grow sample
capacity incrementally with checked batches, rather than reserving its maximum duration at Begin.
Each worst sample contributes
one circle (6 verbs,18 floats,4 weights) and<=one quad(5 verbs,8 floats):<=11 verbs,
26×4+4×4+11=131 encoded geometry bytes/sample before allocator/path overhead. This is a
per-sample construction estimate, not a total permitted sample count. Recheck actual layout.
Do **not** allocate full geometry copies:
keep samples authoritative, stage bounded pages, charge retained CanvasKit path to cache and
account for actual page/path capacity and measured rendering headroom. Actual fallible
allocation/resource failure cancels the unfinished stroke atomically; crossing a soft
monitoring share alone does not cancel it.

No fixed document stroke count is proposed. Many short strokes should cost less than a few
long strokes according to their actual samples, metadata and rendering requirements. The
owner removed the65,536-sample lifetime limit (C1). Bound each batch/page/scheduling slice
while growing retained input incrementally by available resources; never drop samples or
split the user's stroke/history to satisfy a work-slice limit. Finalize exact long-stroke
index/count fields before implementation; no `activeSampleLimit` is emitted.

R1 reports Rust owned capacities, JS owned buffer byteLengths, CanvasKit current linear
memory capacity, live builder/path/image/surface handle counts, geometry sizes and surface
estimates. Exact CanvasKit live-path bytes are not exposed by its public API; heap capacity
includes free/retained allocator space. Picture.approximateBytesUsed excludes large objects
and is not a path meter. In the pinned standard JS, public GrDirectContext resource-cache
usage/limit getter wrappers omit their return values; mark these measurements unavailable
unless exact-build execution verifies numeric results. Do not use private bindings as a workaround.

E01 must calibrate path/builder/snapshot transient estimates, old/new overlap and rebuild peaks.
Observed values and conservative estimates guide cache reclamation only, never a document
rejection solely at a soft target. Host metrics cannot decide editing policy. No arbitrary
64KiB minimum or unmeasured4× multiplier. Required working paths can exceed the optional
cache target, with actual failure handled explicitly; canonical samples remain authoritative.
E01/E02 must demonstrate cold/warm/evicted coherent rendering and oversized single paths.

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
frame/rebuild boundaries. No per-sample production logging. If any soft target is exceeded,
first evict eligible disposable paths/caches, release obsolete bridge buffers and reduce
optional rendering work; preserve actual input, canonical artwork and both history stacks.
Do not cancel a live stroke, lock the page, disable Resume or reject a command merely because
CanvasKit exceeds256MiB, Rust/JS exceed32MiB, CPU exceeds320MiB or graphics exceeds96MiB.
Optional work reduction cannot change stored geometry or hide newly accepted input indefinitely;
its exact bounded scheduling/presentation mechanism remains a reviewed implementation detail.
No automatic reload, blank replacement or target-triggered fatal tombstone.

If a real allocation, surface, context or other required resource operation fails, classify
that observed failure and apply its existing safe outcome: reject/cancel only unfinished
work if needed, preserve completed Rust RAM/history while the owner is usable, and rebuild
recoverable renderer resources. A Wasm trap/uncertain owner remains fatal under the distinct
integrity rule. Deleting paths does not shrink Wasm linear capacity; a persistent high-water
observation is not proof of continuing live-allocation failure. Back/Resume after a target
overage preserves ordinary eligibility unless an actual failure independently blocks it.
WMP-05/09 must distinguish over-target-but-working, recoverable allocation/context failure
and fatal owner loss, without manufacturing a restart or false recovery.

Actual module maximum pages, addressability limits and allocator failure are technical
boundaries that must be reported with the pinned runtime; monitoring shares are not those
boundaries. Do not set a32MiB Rust maximum or256MiB CanvasKit maximum and call the resulting
forced failure owner-approved. E01 verifies instrumentation and returns observed capacity,
growth and recovery findings. Browser/OS termination can occur without any reliable low-memory
warning or cleanup callback; surviving RAM cannot be promised after page/process loss.
This operating policy is **not hard RSS control**. Count physical memory once: paths inside its linear
heap consume that heap's live category share, and remaining retained heap capacity is
headroom, not an additional full heap charge. Include JS copied arrays separately. E01/E02
must measure pinned release heap high-water/retained path peaks and
validate accounting and observed reclamation. Cache eviction calls `.delete()`; `rewind()`
retains storage. No eviction of accepted drawing state. The separately approved16MiB history
retirement target with H1 may retire eligible oldest entries on successful commit, never as a fake
remedy for a soft monitoring crossing. Actual resource failure still must not clear protected
content to render. Rendering page/query overhead stays
bounded even while new ink is suspended.

R1 permits one onscreen surface, one ordinary offscreen staging surface and at most two
snapshot image handles during publication. Delete superseded handles; retire old-size
resources before replacement. Conservatively account for up to four RGBA backing allocations
during snapshot/copy-on-write handoff:128MiB at the approved pixel maximum, before stencil,
Skia cache and driver overhead. Shared backing may reduce this only if measured. This explicitly
replaces the earlier single-surface/no-doubled-surface restriction under the N1/A1/R1 approval.
The96MiB graphics/backing target remains soft; successful allocation above it is not a stop.
Neither dimensional estimates nor CanvasKit counters promise whole-browser RSS accounting.

Explicit context attributes depth:false, antialias:false, stencil:true; inspect actual
attachment formats/padding and caching in E01. G2 pixel/dimension limits remain hard input
bounds. No silent DPR reduction or software fallback. Pin/audit the explicit constructor
sequence GetWebGLContext → MakeWebGLContext → MakeOnScreenGLSurface and matching-context
staging surface creation; MakeWebGLCanvasSurface can replace the canvas and fall back to
software. Verify exact constructors, nullable failures and disposal on the built artifact.

Owner-approved C3 surface/context loss: stop admission, cancel unfinished work, preserve accepted Rust RAM and
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
| WMP-01 | Mouse/pen dot, sharp turn, duplicate center/changed pen pressure, alternating pressure → same-winding swept disk; constant full-width mouse ink and effective reported pen pressure; no finger ink, seams or mutation of old color/width |
| WMP-02 | A/B/lostcapture/C/lateA; touch contact during pen; browser gesture takeover; Escape, blur, resize, Back → unrelated touch alone does not cancel pen; actual matching cancellation removes only unfinished work with no history; browser gestures and fields/IME keep priority |
| WMP-03 | Undo during input rejects; completed stroke Undo/Redo as one; newest indivisible stroke>16MiB follows approved H1; Back/Resume retains ink/settings and both history stacks; Undo-all→Back→Resume preserves Redo; no save claim |
| WMP-04 | Bound±adjacent value, batch256/257, stroke growing beyond65,536 samples while resources remain, actual allocation failure, invalid pressure/sequence → no lifetime-count rejection; failed current batch atomic cancel, stale unrelated event does not cancel current work |
| WMP-05 | Capacity including Begin→cancel/invalid batch with full history, context loss/recovery, asset failure, stale scene page, disposed owner, trapped engine, generation exhaustion → declared state/failure, no accepted artwork/history silently replaced; terminal cancellation/leave still works |
| WMP-06 | en/uk, native width/color controls with8/black defaults, field staging, theme changes, reduced motion, gallery/history → unchanged navigation/AX, honest RAM lifecycle, artwork colors unchanged |
| WMP-07 | Huge bigint/u32-like Number, fake/detached/shared array, mismatched lengths, reentrancy → reject before coercion/copy/mutation; reviewed browser-only fault facility, no production fault endpoint |
| WMP-08 | Offscreen crossing segment, thick offscreen centerline, near containment, subpixel/min pressure, projected extreme → visible clipping/round geometry; semantic and screenshot expectations both |
| WMP-09 | Cold/warm/evicted scene, soft-target overage while allocations succeed, actual resource failure, cancellation during rebuild, repeated resize/context recovery → reclaim/reduce optional work without target-triggered lock; bounded queues, actual timings/heap and distinct failure outcomes |
| WMP-10 | Failed loader/browser-history write, delayed Back popstate, superseded route request, renderer fault after accepted Leave → preflight before Leave; document Undo/Redo preserved on failed or accepted departure, no post-Leave false rollback, stale completion cannot navigate newer session |
| WMP-11 | Pan/zoom at0.1/8, region crossings, active ink, stale pan token, cancelled pan, system remap, zoomed long-stroke geometry → Rust-owned viewport and generation-safe completion; no content/history mutation or queued viewport work; exact numerical reference and visible geometry both required |

The isolated diagnostic is not any row's browser pass. Exact release revision/browser/device,
discovered E2E IDs, results and ignored artifacts belong with each implementing task. No main
merge, product adoption or remaining task confirmation is granted by this document.
