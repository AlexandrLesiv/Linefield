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
history rebranch invalidates affected base content immediately; never show undone pixels as
current. Replacement publishes atomically with matching source/view/resource identity, removing
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
