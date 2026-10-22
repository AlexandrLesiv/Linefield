# MIG-C1 — shared vector editor and direct WebGL contract

Current contract, 2026-10-21. P05-M01. Decision242 delegates remaining M01–M09
technical/design choices to the harness for the owner's ten-hour authorization window.
This version records specialist recommendations adopted by the lead; it is not a claim
that the owner personally reviewed this new text. Supersedes WMP-C2 only where explicit
below. Storage/native applications and post-M09 worker experiments remain separate.

## Ownership and execution

One editor-engine Rust owner mutates an editor on the host main thread. Pure editor-geometry
Rust has no editor mutation exports and is reused by the editor and preparation Wasm.
Rust owns raw input, style, curve semantics, camera, layers, selection, edits, history,
admission, cancellation and revisions. The web host owns event acquisition, local element
coordinates, scheduling, widgets, localization and GPU objects. The host may optimize
device-space coverage/cache planning; it cannot decide semantic selection or document edits.
Future native adapters reuse the same engine and geometry with native input and GPU backends.
No second TypeScript engine, mutable worker editor, custom binary protocol or storage.

## Canonical model and versions

Nonzero monotonic u64 identities never wrap/reuse. Axis remains i64 region plus f64 local
in [0,65536), with positive zero. RawSample stores two Axes, f64 pressure and explicit
hasPressure. Preserve ordered actual samples, including pressure in fixed-width mode.
Sources use immutable 256-sample blocks and a unique unfinished tail. An arena with explicit
ownership counts each allocation once; fragments/history share sources without copying raw data.
Stroke holds source ID, source interval, frozen style, similarity placement, layer ID,
paint order, blend group and revision. Source intervals use u64 curve span plus f64 t;
canonical internal endpoints have t in [0,1), with a distinct terminal endpoint.
Similarity uses regional source-anchor placement and f64 coefficients [a -b; b a].
No absolute f32 world positions or conversion of arbitrary region IDs to JavaScript Number.

Curve version1 freezes the reference Hermite centerline, corners, pressure extrema and
coincident dabs. Material version1 identifies Ink/Hard/Soft paper-contact response. Derived
simplification, chunking and display detail never modify raw data or interval meaning.
History commands are CreateStroke, LayerChange, TransformGroup, DeleteGroup and SliceReplacement.
Reserve terminal/cancel metadata before admission; cancellation needs no new allocation.
No-op commands preserve redo. Preserve the 16MiB history retirement target/newest indivisible
entry exception; account unique retained source ownership rather than duplicated logical sizes.

## Concrete domain

| Property | Domain/default |
| --- | --- |
| Brush | ink, hard-pencil, soft-pencil; fresh Ink |
| Width | 1–512; fresh Ink8, Hard3, Soft12; retain resumed values |
| Color/opacity | normalized floating sRGB, black; opacity0–1, default1 |
| Pressure | raw0–1; absent/mouse full width; min0–0.5 default0.05, gamma0.25–4 default1.8 |
| Pressure radius | width/2 × (minimum +(1-minimum) × pressure^gamma); fixed uses width/2 |
| Camera | zoom0.05–16; angle normalized [-π,π); explicit15° snap intent |
| Surface | CSS axes1–8192, backing scale1–4, backing axes≤8192, area≤8,388,608 |
| Transform | positive cumulative scale0.001–1000, gesture scale0.01–100 |
| Slice | width0–500, default20; zero is topological cut |

Reject nonfinite/out-of-range input, identity overflow and unrepresentable regional arithmetic
before mutation. Current malformed batches cancel that unfinished interaction atomically;
stale/wrong identities do not cancel unrelated current work. No silent sample filtering.

## Checked generated boundary

Keep wasm-bindgen0.2.129 and existing checked JsValue input machinery. Generated declarations
are the host type source. IDs are bigint. No raw pointers, handwritten duplicate model or
unvalidated typed-array coercion. Ordinary fixed ArrayBuffers only; reject shared/resizable
backing. Copy snapshots to host ownership; release one outstanding boundary snapshot in finally
before the next command. Read-page cursors are revision-scoped, not mutable editor handles.

M02 adds named style/begin/append/end/cancel/Undo/Redo, pan begin/update/end, zoomAt/rotateAt,
scene IDs, stroke snapshot and geometry-page exports to existing lifecycle/metrics APIs.
Begin captures mapping/pointer; append includes interaction, base mapping and exact first index.
Append is 1–256 samples with equal x/y/pressure/presence arrays, atomic validation/reservation.
End supplies next index; cancellation is idempotent. Camera drag captures base mapping and
sequence; modifiers cannot change an active gesture. Rotation drag uses the same captured-base
contract as pan. Replies identify owner/session/scene/mapping/interaction and explicit outcome.
Scene-ID pages contain≤256 IDs; geometry pages≤1024 capsules of six f32 values plus local
origin/placement, style/order/group identity, next cursor and completeness. Never truncate.
Geometry pages expose a stable pageId scoped to stroke/geometry revision, not a mutable handle.
The copied descriptor carries source/geometry/stroke/styleRevision/order/blendGroup bigint IDs,
next/done and capsule Float32Array; regional origin is Rust-owned. Named memoryPlacement
(owner,session,mapping,stroke,geometry,pageId) returns current mapping, available/culled status
and a copied Float32Array[6] affine placement certified by Rust for this page and view.
Camera changes request placement without rebuilding/reuploading unchanged capsule buffers.
A bounded memoryPlacements query may accept≤256 page descriptors and return ordered placements
with per-item status; descriptors are validated atomically before access. No caller-supplied
regional origin or JS world-coordinate arithmetic. Add later tool exports only when consumed.

## Geometry precision and bounded work

Rust derives source-local f64 curves. Disposable f32 pages are locally rebased and accompany
Rust-issued local-to-view mapping. A4096-world-unit partition target is not an endpoint clamp:
split crossings with conservative support margins. Subdivision is resumable; output capacity
or depth exhaustion yields another bounded unit, never a silently coarser curve.
Target quarter device pixel error with a quarter screen logical/CSS-point ceiling AFTER zoom, including curve-edge,
pressure/radius interpolation, packing and transform arithmetic. Refine/rebase if uncertified;
explicit numerical failure is not a passing approximation. Stable detail depends on effective
scale, not pan position. Bounds include transformed thick support and fragment endpoints.

GPU arithmetic certification must include fragment distance/radius evaluation and the operation
error allowances in [GLSL ES3.00 section4.5.1](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf),
including its unspecified rounding mode and division/square-root accuracy. A CPU experiment
using round-to-nearest f32 alone is not a guarantee for every conforming WebGL2 implementation.

M03 worker input is≤132 source samples including neighbors,≤8KiB/job including metadata;
result≤256KiB including bounds, with resumable geometry pages. At most8 in-flight jobs,
256 pending descriptors,8MiB total: at most6MiB ready plus2MiB reserved for worst-case in-flight results. Identities include owner/session/source/source revision/style/curve/chunk/detail
and request generation. Main Rust checks relevance. Jobs are immutable copied inputs.
Stale disposal never drops accepted samples. Worker loss uses the same pure bounded function
scheduled outside input callbacks. Camera-dependent worker planning is not included here.

## Rendering and resources

### M03 preparation and frame receipts

The lead adopted this concrete amendment under decision242 on2026-10-21. Main Rust issues
`memoryPreparation(owner,session,scene,stroke,chunk,revision,detail,mapping)`: an immutable
snapshot of at most132 local f64[x,y,radius] points, source interval, opaque source anchor,
token and conservative coverage certificate. The pure preparation Wasm exposes only
prepareBegin/prepareNext/prepareDispose, sharing its implementation with the bounded fallback.
Each next step performs at most4096 subdivision steps and emits at most1024 capsules; it may
yield progress without a page. A step count is not an elapsed-time guarantee. Never replay a
prefix, truncate output or do an entire cold scene synchronously from an input callback.

Ordinary chunk results are view-independent. Main Rust may issue a conservative source-local
clip for pathological broad chunks; the worker applies immutable geometry filtering, not camera
planning. Clip against conservative curve control hulls plus thick support/AA margins, preserving
fragment endpoints. Rust certifies complete prepared coverage and validates whether it still
covers the current needed view. A mapping change alone must not discard still-useful coverage
and starve a continuous pan. Newly revealed coverage needs fresh preparation; a clipped result
cannot be presented as complete outside its certificate. This is not M12 worker planning.

`memoryAdoptPreparation(owner,session,token,ordinal,capsules,metadata)` validates exact source,
chunk revision, detail, coverage-certificate consistency, progress/order and fixed finite array shapes before
issuing a stable page lease. Capsules contain at most6144 f32 values and metadata at most10 f64
values for relative origin/bounds/centers. The canonical anchor remains Rust-owned. Invalid or
stale data cannot change source/history or certify incomplete coverage. Explicit token/page
release and all worker heaps, copied arrays, reservations and ready data count toward the
existing job/queue/8MiB limits. A10-second watchdog, one worker restart and bounded pure fallback
prevent unbounded stalled jobs; normal cache misses never force a full synchronous rebuild.

A Rust-issued immutable frame receipt identifies an exact committed prefix and its view.
Capture/append return Rust-issued frameContent and frameMapping, rather than allowing the host
to label an older receipt with current state. Append preserves the receipt's captured mapping;
frameContent=0 explicitly denotes a strict prefix without a full-document content certificate.
Only full current identity plus exact view/metrics can satisfy readiness or complete acknowledgement.
Named memoryFrameTransform(owner,session,receipt,currentMapping) returns a certified device
affine and content validity. Host presentation may transform this coherent base and composite
accepted pending/active groups in order, without duplicating Rust camera arithmetic. Undo or
history rebranch invalidates affected base content immediately; never certify undone pixels as
current. The bounded historical-display exception below preserves visual continuity until replacement.
Replacement publishes atomically with matching source/view/resource identity, removing
overlays only when their content is included exactly once. Preserve identical union/blending.
No new stroke waits for normal cold-history preparation. Actual context loss has no surviving
GPU base: keep honest unavailable/recovery state until coherent reconstruction completes.

Prepared results may be retained when source/detail/sequence are valid even if the current view
has moved outside their coverage. A separate Rust coverage query determines which areas they
can satisfy; schedule missing coverage without throwing away useful completed work. Frame
completion still requires the complete current needed coverage, not merely some valid pages.
Receipts contain whole union groups. An unfinished stroke cannot be split into independently
source-over-composited base and tail portions. Undo reconstruction must make bounded progress
for unaffected committed groups during continued input; measure history-to-correct-frame time.

GPU geometry uses actual-capacity retention within128MiB including256KiB streaming reserve,
with bounded4MiB growth slabs, reusable allocations and coalesced free ranges. Optional retention
failure streams complete output; context loss invalidates GPU leases without erasing raw data.
Keep staging/mask/base/overlay capacity within the composite budget. Measure cold work, uploaded
bytes, combined UI frame and visible reveal; transformed old pixels alone are not a reveal pass.

M03 format amendment: two R8 masks store scalar MAX coverage separately for paused candidate
reconstruction and immediate active overlays; RGB8 stores fully opaque paper-composited
base/staging color. Preserve8-bit channel precision and ordered coverage;
this does not permit discarding alpha from future transparent layer intermediates. At the
maximum8,388,608 pixels these four targets request64MiB of texture payload, consuming the64MiB
composite allowance. Optional caches then have no remaining capacity unless eligible targets
are safely released/reused; at smaller sizes they share the remaining allowance. Driver padding
and internal formats may consume more; report them separately and never claim64MiB physical
residency. Include simultaneous resize/rebuild generations.
Check framebuffer completeness. Unsupported RGB8 uses two RGBA8 targets: RGB holds opaque color,
alpha holds scalar coverage. Copy a mask to a distinct texture before compositing into its
original RGB target; never sample an attached write target. Serialize or restore any other live
mask before overwriting its alpha. This retains8-bit precision and8bytes/pixel, with extra copies;
preserve accepted ink/admission and order, do not downsample. Measure this fallback honestly.
Same-build pixel parity, paused-mask overlap and context restoration
are required before claiming the format amendment works.

### M03 live-prefix and deferred validation amendment

The lead adopted these refinements after the bounded early checkpoint identified a64.6ms
getError call inside a66.6ms rendering callback. This is measured driver-call CPU blocking,
not evidence of equivalent geometry cost. The checkpoint stopped before completing its long
stroke; no performance gate is weakened by changing validation scheduling.

Named memoryStablePreparation(owner/session/stroke/fromSourceIndex/detail) exposes at most128
immutable source intervals plus their bounded neighbors, a Rust-issued through index and
minimum-source proof. Active intervals exclude the neighbor-dependent terminal portion;
completed strokes include their terminal interval. Stable-page placement validates source/style,
the certified immutable prefix and captured mapping. Ordinary chunk revision fences stay exact.
During active input the view is fixed by existing admission rules; resize cancels the interaction.
The host may accumulate stable coverage once in a persistent MAX mask and release applied
geometry, while rebuilding only the changing tail in a separate mask. Composite their MAX
coverage once per logical group. Mask capacity cannot become a stroke/sample quota.

If a bounded immutable active-prefix snapshot is required for streaming, keep at most current
and building snapshots per interaction/view, sharing immutable blocks and copying only a bounded
tail. Its receipt is explicitly provisional, never a committed-complete acknowledgement. Cancel
invalidates it immediately; continued appends cannot force unbounded restart of useful work.
Base reconstruction and mask roles must make bounded progress without corrupting each other.
Ending A and starting B must preserve independent group order and immediate input admission,
including oversized/pending A; a single-active-stroke demonstration is insufficient evidence.
Rust stroke information exposes whether the requested stroke is the current active interaction.
Create a stable live-prefix accumulator only for that active stroke; its existing accumulator may
continue through End until promotion. Historical completed groups, including Redo or a group that
finished before obtaining a live accumulator, use retained completed preparation/GPU pages through
ordered frame reconstruction. Do not replay completed history through a new active-tail budget.

GPU validation uses at most two submitted in-flight fences. Poll with zero flags/zero timeout
outside input callbacks; retain the latest pending render intent and every accepted Rust sample.
Do not submit indefinitely behind a busy GPU. Drain all outstanding fences before bounded
getError validation, with no new GL work between the idle check and validation; checking only
an earlier fence can still synchronize later commands. Initial setup/allocation checks remain;
later allocation validation uses an idle boundary or reserved complete-streaming resources.
No gl.finish, blocking GPU wait or spin loop. Source-complete/submitted, GPU-validated and
physical display are distinct states/measurements. First/recovery readiness requires validated
coherent output. Keep a validated completed base while a candidate remains in staging; publish
only a matching validated receipt. Active overlays over that base may be provisional.

Shared display usability is separate from exact-content acknowledgement. Projection.display_usable
starts false on entry, metrics remap, suspension and render recovery. Named memoryDisplayReady
(owner,session,mapping,receipt) accepts only a full current committed-source/order/content receipt
at the exact current view/metrics; equal stroke count alone is insufficient. The host calls it
after coherent GPU validation. Shared fresh-input admission requires usability. Ordinary commits,
history and camera previews retain usability over a surviving validated base, so subsequent ink
does not wait for reconstruction. memoryPresented still acknowledges only a matching complete
validated content/mapping receipt, never merely an available old base or provisional overlay.

Bounded host submission batches may cross page and group boundaries: prepare an ordered queue
of at most32 ready begin/page/composite commands and1MiB payload independently of GL. Borrowed
geometry remains pinned until consumed or cancelled. Wait for ready work before acquiring a
GPU slot; never hold an unsubmitted reservation across worker/preparation awaits. Submit ready
commands for at most2ms or256 commands, then fence once at the yield/publication boundary.
The queue still holds at most32 commands/1MiB at any instant. A submission slice may consume
explicitly ready cached/resolved refills through a bounded producer handoff, but must fence
before waiting for actual worker/preparation work. No microtask polling or unbounded refill loop.
Include producer/refill/adoption CPU within the slice deadline. Yield an actual host task after
each nonterminal slice with no GPU reservation held; immediately resolved promises alone do not
provide input fairness. The ordered reader must distinguish synchronous retained/resolved pages
from pending preparation and retain head-of-order blocking even if later jobs finish sooner.
An independent bounded producer advances ready preparation while the consumer waits for GPU
admission, including across small group boundaries. It shares one serialized cursor with ready
refill, sleeps on pending-head or capacity changes, and obeys cumulative work/task-yield limits.
Consumer polling alone must not pace cold worker preparation at the animation-frame cadence.
An individual GL call cannot be preempted; measure overruns rather than claiming a hard2ms bound.
Paused group masks survive batches and final publication still requires a complete validated
receipt. Cancellation/failure drains ready payloads, borrowed leases and pending queue reads.
This is backend scheduling, not a new FFI command protocol or per-page animation-frame pacing.

M03 cold-admission refinement: before reserving a GPU slot, a genuinely pending ordered
preparation head may coalesce useful partial ready work until capacity, terminal/error/cancel,
or eight milliseconds from the queue's original empty-to-nonempty transition. Reset that age
only when the queue becomes empty. Full command/byte capacity, terminal small groups, synchronous
retained/resolved work and producer task-budget yields bypass this delay. Poll already settled
work within the existing CPU budget before classifying a head as pending. A lone initial group
marker with no drawable page/composite waits for actual producer progress without repeatedly
submitting empty fences or scheduling an already-expired timer. Empty/all-culled documents still
reach the existing validated empty-paper path. No worker await may hold a GPU reservation.

Keep one admission waiter and at most one deadline timer; subscribe/recheck without lost wakes,
clear both on every exit, and wake promptly on cancel/error. A timer serviced late is measured
lateness, never grounds to restart the eight-millisecond allowance. Preserve queue32/1MiB,
page24,576 bytes, producer2ms/1,024 transitions, submission2ms/256 commands, actual task yields
and two fences. This is one measured scheduling candidate, not a relaxed latency gate. Record
bounded test-only admission reason/age/overshoot and waiter/reservation high waters; no per-wake
production logging. MIG-WORKER-25–28 cover cold bursts, warm/terminal bypass, stalled-marker
cancellation, pressure/failure and late callbacks before same-host performance comparison.

Null fences, WAIT_FAILED, context loss or a10-second no-progress watchdog enter the existing
bounded renderer recovery path, retaining canonical/history and canceling only unfinished work.
This watchdog is a failure safeguard, not an acceptable latency budget. Fence/lease retirement
is bounded and accounted, including queued/running/retiring jobs. Report renderer-generation
errors without guessing which draw caused a shared GL error. Fresh CPU and complete-validation
timings, failure E2E and mask/prefix parity are required before declaring this amendment effective.

The performance-E2E build may observe final active-overlay submission and matching validated
receipt publication through a bounded metadata ring. Records include timing, monotonic submission
sequence, accepted input revision and scene/mapping/resource identities; no raw samples, artwork
or coordinates. External draining must not call observers synchronously from the render path.
Count drops and invalidate affected measurements. Production builds exclude the observation
sink and hooks. Record the instrumented build separately and distinguish submission, validation
and physical display; GL fences alone cannot prove that the latest accepted artwork was shown.

### M03 repair refinements

The owner resumed M03 repairs on2026-10-22. These refinements preserve the selected ownership,
numerical guarantees and resource limits; they do not reopen the paused M01–M09 automation.

Legacy full-source geometry pages may center their local origin over the collected endpoint
bounds. Keep every coordinate within the existing signed coordinate-magnitude limit and retain
the original per-capsule subdivision/difference bound. At most1024 capsules use a fallibly
reserved48KiB f64 packing scratch before the checked f32 copy; count overlapping scratch/output
capacity. Preserve all geometry, exact endpoint order and each pending boundary pair exactly once.
This is packing reuse, not clipping, lower detail or a larger arithmetic-error allowance.

A candidate whose source prefix or metrics Rust rejects must cancel promptly rather than wait
for the worker watchdog. Mark its host lifetime cancelled before terminating its exclusive
preparation executor. Captured readers retain that executor/generation; cancelled readers cannot
retry, adopt or store results, and cancellation does not consume a renderer recovery attempt.
Wake the producer, join its readers and retire queued borrows/tickets before clearing the
candidate and lazily starting a replacement executor. Retain eligible completed cache entries.
An acquired GPU reservation still follows its fence/finally retirement path if cancellation
arrived while acquisition was pending. Ordinary valid pan/appends do not cancel useful work.
This relies on the existing sole-candidate executor ownership; it is not a new worker protocol.

An unexpected editor-Wasm boundary exception permanently invalidates that editor instance.
Typed rejection outcomes do not invalidate it. Fence command calls, returned-value reads and
destructors together: after a trap, no further editor export, including release/free, may run.
Later user commands reject explicitly; terminal disposal may report an already-disposed outcome.
Host queues, workers, leases and GPU resources still drain without calling the invalid editor.
Back/Retry cannot reset this fence or recreate canonical work as if recovery succeeded. The
independent pure preparation instance retains its own failure lifetime. Verify a confirmed
pending candidate followed by a fatal exception, late completion and Back, with a positive
export spy covering getters/destructors as well as commands.
If a returned wrapper's getter traps before explicit disposal, retain that one terminal wrapper
strongly until page teardown so its registered finalizer cannot call the poisoned instance.
This bounded terminal reference is not a reusable cache or a raw-pointer ownership workaround.

Completed provisional overlays may borrow already prepared complete chunks after Rust validates
source/revision/detail/coverage. Retain the same page identity and pin its lease through all
consumers; release exactly once after submission or cancellation. Explicit misses/incomplete
chunks use bounded preparation, never a false complete-group result. Active terminal geometry
keeps its immediate path. Shared reuse must not introduce a second owner of canonical samples.

Refine detail immediately when required. Retain useful finer pages during navigation, and request
coarser sufficient detail only after250ms without a view change. Restart that delay on renewed
navigation; pan alone must not reprepare view-independent geometry. Rust continues to enforce
minimum detail/coverage. Disposable alternatives remain within existing cache limits and may
be retired under pressure. Coarsening never reduces the accepted precision guarantee.

Host controls may cache locale formatters and skip unchanged presentation updates. Shared input
admission and contact/sequence state still update synchronously; no actual samples or capability
changes may wait for deferred UI work. Diagnostic phase timing remains compile-time test-only,
bounded and content-free, and cannot justify a production per-sample log.

### M03 history display continuity repair

The owner reported a white flash during Undo on the9ba39de preview and requested continuation.
Under the authorized M03 repair scope, the lead adopts this reviewed presentation amendment.
Undo/rebranch still changes Rust state and invalidates affected content certificates immediately.
Keep at most one already validated base texture and its receipt as display-only history while
the latest valid replacement builds. Never clear unaffected artwork to white merely because
the old content certificate failed. This uses the existing base target and receipt allowance,
not another full-resolution cache. It does not relax history completion-time limits.

Named `memoryFrameDisplayTransform(owner,session,mapping,receipt)` provides only the checked
captured-view to current-view transform for this retained raster. It validates editor/session,
receipt lifetime, current mapping and identical metrics, but does not certify the source prefix.
Strict frame transform, placement, preparation, input admission and acknowledgement retain their
existing checks. The host marks a rejected base permanently display-only until replacement;
even a later matching history state cannot silently promote that historical status to current.

Historical pixels never acknowledge current content, establish first/recovery readiness, drive
hit testing or supply geometry/history to a new branch. Live promotion cannot append to that
base. Current accepted strokes absent from the historical raster remain visible in order using
Rust source identities and current placement; do not re-composite surviving historical groups.
Preserve immediate fresh ink and bounded reconstruction progress. No new spinner, flashing
controls, queued history action or artificial input lock accompanies this transition.

Pan/zoom/rotation transform retained pixels through Rust and keep fresh overlays aligned.
Missing newly exposed coverage is still incomplete, never a successful complete acknowledgement.
Replace the historical target atomically only with a validated relevant candidate; release its
receipt then, and never restore it afterward. Repeated history/rebranch cancels obsolete candidates
and current cancelled overlays, retaining only the single historical image until valid replacement.
Context loss, metric/resource replacement, fatal teardown and Back dispose this fallback through
existing lifetimes; it cannot cross sessions or conceal a mandatory-resource failure.

MIG-WORKER-21–24 must cover held reconstruction with continuous unaffected pixels/no false ack,
fresh short and long ink/rebranch, repeated history, pan/zoom/Escape, cancellation, overlapping
groups and lifecycle retirement. Compare final current pixels and receipt identities; historical
continuity alone cannot pass the correctness or timing gate.

### M03 indexed visibility amendment

Rust owns an optional ordered AABB hierarchy over completed strokes and their128-interval
chunks. Bounds use checked regional axes and conservative curve/thick-support hulls; never
flatten far positions into global f32 coordinates. Traverse left before right to preserve paint
order. Unknown, partially built or overflowing bounds cannot certify invisibility: descend or
resume a complete conservative scan. Camera-dependent worker planning remains excluded.

Named `memoryFrameVisibility(owner,session,scene,frame,cursor)` returns a generated snapshot
with code, equal-length strokes/chunks/revisions arrays of at most128 entries, an opaque next
cursor and done. Zero starts a query. Each call visits at most512 nodes and constructs at most
four missing chunk hulls; empty progress is valid. Include this CPU work in the host's existing
cumulative2ms/1024-transition budget and yield an actual task. Read captured source positions
directly rather than repeatedly scanning the beginning of the document for every page.

At most two cursors, each at most8KiB including its bounded traversal stack, bind the captured
frame prefix/view/metrics and index generation. Index generations/node identities never reuse
an exhausted identifier. Certified nodes identify immutable source intervals and curve/style
revisions. Valid later appends or camera movement do not invalidate the captured receipt;
rejected source-prefix/metrics changes do. Frame release/cancellation retires cursor pins.
Use at most128 stack entries if a combined source/chunk traversal cannot prove a64-entry bound.

Optional index storage is at most8MiB actual allocated capacity across all live generations,
incomplete construction and scratch, separately counted from the existing8MiB worker budget.
Report cursor and reply capacities in derived memory too. Live queries pin referenced node
identities; eviction cannot replace them with unrelated nodes. Pressure may evict unpinned
least-recently-used index data. If admission fails, continue an ordered bounded scan from the
exact unconsumed source/chunk without omissions or duplicate output. Cursor allocation failure
returns capacity and allows the existing complete host traversal. No index allocation/rebuild
belongs in the actual-sample callback or becomes a canonical drawing quota.
If fallback cannot preserve the exact remaining position after output has been consumed,
abandon that staging candidate and restart from empty under its valid receipt; never append a
full traversal to partial output. A query page may end inside one stroke: keep its MAX group
open across pages/empty progress and composite once at the next visible stroke or final done.

Verify cold/warm/evicted equivalence, many offscreen short strokes and long-stroke chunks,
rotated/thick crossings, far regions, coordinate overflow, partial construction, pinned pressure,
continuation/cancel and paint order. Measure visited nodes/hulls, preparation counts and complete
frame time separately; a warm index cannot turn cold construction into an inherited pass.
Exercise capacity failure after at least one emitted page, including a split stroke and ordered
overlapping groups, to prove the fallback cannot double-composite or omit output.

Direct WebGL2 analytic capsules. MAX coverage unions each logical stroke/source-union group;
source-over composites groups once in layer/paint order. Pencil remains nonopaque at opacity1.
No cached image may change order, overlap, union identity or source appearance. Geometry cache
misses cannot hide accepted strokes. Input acceptance never waits for a completed frame.

M02 thin-taper AA refinement: evaluate the continuous envelope of the source discs' antialiased
coverage, rather than applying the tiny-radius cap only to a numerically selected nearest disc.
The reference nearest-disc choice can flip at near-containment and cause a large coverage pop.
Keep equal-radius and cap-inactive behavior, the existing tiny-dab area treatment, and the stable
analytic distance fast path. A bounded radius-domain search is permitted only when the subpixel
cap binds; its explicit coverage-error budget and independent f64/GPU evidence are required.
This is an intentional rendering robustness amendment, not a relaxed geometry tolerance or
editing/source-curve change. Record the before/after case and conditional performance cost.
For eight radius-domain bisections over an interval≤0.5device pixels, the exact-arithmetic
coverage loss is≤1/256. Shader floating-point error and readback quantization are additional,
separately reported terms; an alpha-value error is not a pixel-distance error. Bounded CPU/GPU
conformance establishes evidence for the tested implementation, not every conforming driver.

Soft monitoring targets:320MiB owned CPU,384MiB owned GPU. Exceeding targets alone never rejects
input or sets document capacity. Report canonical/history/Wasm high-water/derived/worker/GPU
capacity/masks/composites/material separately; driver/default framebuffer estimates are distinct.
Geometry working cache128MiB includes256KiB streaming reserve (two4096×32-byte buffers).
Composite allowance64MiB includes optional16MiB tiles. Count shared allocations once.
Evict spare/offscreen detail and optional pixel caches first. Stream uncached pages through
reserved buffers while preserving complete per-group coverage before ordered compositing.
Staging output publishes only coherent scene/view/resource generations. Bounded fallback may
retain the previous coherent frame while building replacement; never acknowledge partial output.
Correct streaming is not proof of acceptable speed: applicable performance gates still apply.

Actual mandatory allocation/submission failure retains canonical/history, cancels unfinished
interaction through Rust, invalidates disposable generations, releases resources and tries one
reduced-cache rebuild. Failure exposes Retry/Back, without per-frame retry loops or reload.
Do not advertise usable drawing when no output can be displayed. Optional allocation failure
falls back completely; context loss cannot commit an unfinished interaction. Browser/OS process
termination may be unrecoverable because this slice is explicitly in memory.

## Interaction invariants and later extensions

Keep CT-02/03/04/06–09 and INV-01–05/08/09/11. Undo/Redo/tool/layer changes reject during active
editing, never queue or auto-end. Focus loss, invalidating resize, cancellation and renderer loss
restore interaction prestate without Undo. Field/IME shortcuts and Escape retain priority.
View changes do not add document history; pan/rotation cancellation restores the captured view.
Back/Resume retains document/history/view/settings/valid selection; close/reload loses session.

M06 named layer commands report affected order/scene generations. M07 eligibility, Lasso/Pick
and group transforms are Rust-owned and independent of renderer warmth. M08 calculates source
interval replacements from all accepted gesture samples; one gesture is one Undo, no-hit preserves
redo. Shared-source siblings retain painter order with explicit union/blend identities.
See MIG-D1 for controls and quality/web-gpu-editor for observable scenario requirements.

## M02 concrete numerical/query refinement

Continuous rotation uses bounded canvas-local f64 inverse offsets from the accepted sin/cos
pair and its determinant, then the existing exact regional normalization of represented
offsets. No global region flattening; account inverse/packing/projection error together.
The logical-point ceiling is screen space after zoom, as in web-memory-numerics.md; it does
not require0.25world-unit approximation at minimum zoom.

Geometry queries address128-source-sample chunks with exact neighbor-dependent revisions.
Page origin rebasing uses extent≤min(4096world units,4096/detail) to bound GPU intermediate
arithmetic, as well as f32 packing. This is a disposable partition, never coordinate clipping.
A bounded Rust subdivision/source continuation resumes without replaying prior capsules.
Opaque cursors are owner/session/geometry/chunk/detail fenced; forged/stale/out-of-range
continuations reject. Page identity reuses the same stroke/chunk/revision/detail/ordinal.
Placement revalidates source dependence and sufficient detail for current view/backing.
Discarded pages release their disposable descriptor leases; charge registry capacity.
Initial M02 descriptor leases are bounded4096; host retained derived cache≤3072leases/16MiB,
with≤512 transient chunk pages. A full forward scan streams uncached pages rather than
evicting the next needed cached chunk. Unseen pages may remain as bounded disposable data
for Undo/Redo reuse; evict them under admission pressure and revalidate source/detail before
reuse. Retaining a page cannot retain canonical/history ownership or resurrect a source. Remaining
geometry streams completely through the reserved buffers, releasing uncached leases. These
working-cache choices are not document limits. M03 extends GPU retention/allocator reuse.

Recognized trusted browser terminal ordering: matching primary mouse/pen capture loss with
buttons0/button−1 may precede pointerup. The host freezes sample acquisition and waits for
the matching trusted terminal release without a time cutoff. Genuine interruption, blur,
pressed movement/fresh contact or capture transfer cancels through Rust; it never auto-commits.
Late terminal events cannot affect a new interaction. This is acquisition ordering, not a
second host editing policy. Synthetic event probes do not establish physical Wacom evidence.
