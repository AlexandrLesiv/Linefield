# M04 bounded sparse coverage

First-stage contract adopted by the lead under decision243 after shared-engine and rendering
review. Implementation waits for the frozen M03 predecessor and one assigned M04 writer.
Compiled/GPU correctness and performance checks below remain required, not passed by design.
Completed-region reuse, raster-lattice proof and the optional tile archive are later M04 stages.

## Responsibility and preserved authority

Rust owns immutable source order, geometry, sufficient detail, checked placement and receipt
validity. The host plans disposable device-space routing over those validated pages and owns
WebGL allocation, scheduling and retirement. No new editor export, canonical model, worker
topology or handwritten geometry policy is introduced by this stage.

Only completed-candidate G→S work uses sparse routing. Keep M03 B/X, L/F/T, sealed S, physical
packed-mask ownership and at most eight frame/tail receipts. A Prefix is source authority;
LiveSource/DisplayOnly cannot become current geometry authority. Candidate/source/renderer
identities fence every cohort and completion. Neither source authority nor a completed CPU
plan proves that GPU pixels are complete.

## Conservative first integration

The lead adopts a one-page completed-group entry for the first runtime checkpoint. Only the
following actual Composite proves that the retained page is the entire logical group; a second
Page permanently selects ordinary rendering for that group before any sparse work is issued.
This is optional optimization admission, not a stroke-size limit. Multipage and empty groups
retain the complete path. Require useful ordinary-app short-stroke and warm-history hits before
enabling this entry; a fixture-only hit does not retain an optimization benefit.

FrameCommands owns the held page explicitly. It remains inside the existing32-command/1MiB
admission, including its original age, until released exactly once. Producer lookahead must
remain possible at capacity. Delayed Composite/second-page preparation, route planning and bank
waits occur without a reserved GPU slot. Preserve the captured Prefix, style, immutable checked
placement and CPU page for replay; never obtain replacement authority from a newer editor view.
An unexpected Group or end-of-stream before Composite is failure, not permission to compose.

For an optional pre-S refusal, drain issued G readers, clear G and replay the retained group
once through the complete pass. The first presenter S write is an irreversible boundary: mark
it before issue and discard/recover the candidate on any later uncertainty. Do not replay over
partial S. Geometry-loan, route-bank and G-presenter reader lifetimes remain independent.

This restriction does not change the representations or limits below. Review the actual finite
arithmetic enclosure, queue accounting, replay and reader lifetimes before enabling production.
Compare complete versus sparse costs including failed attempts, routing, clear, uploads and
presentation. Retain complete rendering if useful end-to-end improvement is not established.
Production pan-lattice and archive adoption remain separately gated; this entry does not replace
large-stroke or panning acceptance.

## Fixed representation and resource limits

Use the existing G mask as an atlas of full64×64 device-pixel slots. For backing W,H, columns
and rows are floor(W/64),floor(H/64); capacity is min(1024,columns×rows). A smaller axis or zero
capacity selects the complete path. Destination edge tiles may be partial; atlas slots may not.

Two route textures each have1024×16 RGBA16I texels, NEAREST, no mipmaps:131072 bytes each,
262144 bytes total. A texel holds signed16 destination tile x/y and atlas slot x/y indices.
The checked slot-x value−1 is the padding sentinel; all other components are initialized too.
Validate coordinates, slot capacity and products before narrowing. Upload whole1024-texel rows;
padding and both live/retiring banks count. No presenter VBO, replicated capsule buffer or
additional sparse mask is allocated.

One fixed524288-byte planner backing store contains:

| Owned region | Bytes |
| --- | ---: |
| Two route staging banks |262144|
|128×128 destination slot IDs / group stamps |32768 /65536|
|1024 slot-to-destination pairs |4096|
| Two512×32-byte descriptor banks |32768|
|512 fine bounds /32 coarse bounds, four f64 values each |16384 /1024|
|1024×6 f64 projection scratch |49152|
|1024 current-span slot IDs |2048|
| Fixed cursor/state/loan reserve |4096|

Used backing payload470016 bytes fits that allocation. No per-source retained accelerator or
unbounded route objects. Host wrapper/closure overhead is reported separately. Any further
owned arrays require accounting within the2MiB optional CPU allowance before admission.
Before u32 group-stamp reuse, budget-clear the fixed grid after old G/route readers retire.
Rollover cannot collide with a live group or trigger an unbounded input-path scan.

Routes remain inside the192MiB target/geometry aggregate, including retiring generations.
At maximum backing, routes leave87.75MiB normal or63.75MiB packed for geometry including its
existing256KiB stream reserve. Actual geometry also retains its128MiB upper bound. Allocate
both banks at healthy idle admission or clean up and disable sparse for that renderer generation.
No per-frame retry. Context/global errors follow mandatory recovery rather than local fallback.

## Route lookup and bounded work

One cohort references one existing geometry page, at most1024 capsules/24576 bytes, one checked
placement and group style. Fine spans contain two consecutive capsules; an odd terminal capsule
uses spanSize1. Sixteen-span coarse bounds reject work conservatively. Each span has a route
stride R, a power of two1..1024, padding unused entries. Empty spans end a contiguous descriptor
run or retain explicit sentinel rows; they cannot shift following routes.

A descriptor has eight u32 words: firstCapsule,capsuleCount,routeBase,routeStride,spanSize,
instanceCount,reserved0,reserved1. Reserved words are zero. Consecutive spans share it only at
the same stride and span size. Capsule attributes use24-byte stride, offsets at the retained
allocation plus firstCapsule×24 and +12, and divisor R. With local integer instance i:

`source = firstCapsule + i/R`

`route = routeBase + ((i/R)/spanSize)×R + i%R`

Use highp integer lookup. Draw capsuleCount×R instances; split only at complete span boundaries
and adjust both firstCapsule and routeBase. Cohort limits:512 descriptors,16384 route entries,
32768 replicated instances. One draw has at most4096 instances. Ordinary/live drawing restores
route mode and both divisors to1 explicitly; the presenter has no capsule-attribute dependency.

Keep the existing ready queue32/1MiB, counting cohort page loans in it, two submission fences,
cumulative2ms/1024-transition producer budget and genuine task yields. Time checks belong inside
planning loops. One bounded continuation survives a yield; no reservation is held while waiting
for a bank, source preparation or another task. Work counters never reset on a page/yield.

Optional sparse work limits are262144 route entries AND262144 replicated instances per group,
3000000 instances per candidate and36×actual visited source instances. They are optimization
admission limits, not source quotas. Unknown future source size cannot inflate the denominator.

Additionally count conservative integer coverage sample area F for every non-sentinel
capsule/route pair, including overlaps. Use checked sums and outward CPU bounds; no pixel-sized
allocation. Limits are65536/draw,262144/submission slice,4194304/group and16777216/candidate.
Split at span boundaries; an indivisible excess chooses complete group fallback. Overflow does
likewise. Candidate exhaustion disables subsequent sparse attempts for that candidate. Existing
time/command limits may stop earlier. These work caps do not establish a GPU-time guarantee.

## Geometry loans and retirement

Prefer the existing arena allocation, including a newly uploaded allocation returned by its
ordinary admission. Exactly two loan records protect the corresponding bank's allocation and
fixed range. Both eviction paths skip either loan; compaction skips the whole slab containing
a loan and rebuilds free ranges from all unchanged allocations. Two banks may loan the same
page independently. Acquiring the second cannot evict the first. Warm hits add zero geometry
uploads; route uploads remain separate.

If arena admission returns no allocation, fall back for the whole uncomposited group. Do not
partition the live stream buffers in this stage. Measure missed sparse opportunities and
pin-induced misses; complete fallback is correctness, not evidence of retained sparse benefit.

Each loan carries renderer/cohort/page identity, allocation/range, last reader serial and
whether future descriptors remain. Release only after all descriptors are gone and the last
reader validates. Upload-before-draw failure still assigns the finally fence to retirement.
Cancellation drops unissued work but preserves issued readers and their accounting. A signaled
first fence does not prove retirement while the second is pending: current submission validation
drains all outstanding work. Context loss can invalidate readers; ordinary cancellation cannot.
The route bank itself also stays immutable while any descriptor remains unissued or any reader
is unvalidated. Cancelling future descriptors alone cannot free its in-flight contents. Bank,
geometry-loan and G-presenter lifetimes are tracked separately, without a third bank or fence.

## Pixel mapping and conservative quads

Keep the current scale, pa/pb endpoint calculations and entire analytic fragment body unchanged.
For each route form outward integer destination bounds in the shader:

`lo = floor(min(pa.xy,pb.xy) − (max(pa.z,pb.z)+2))`

`hi = ceil(max(pa.xy,pb.xy) + (max(pa.z,pb.z)+2))`

Intersect with the destination tile and actual backing rectangle. Empty/sentinel intersections
produce no fragments. Map integer vertex v to atlas coordinates `a+(v−t)`, where a/t are the
64-pixel slot/tile origins. Use actual G dimensions for clip conversion and flat exact origins.
For top-left atlas pixel center q, evaluate the unchanged coverage body at `pos=(q−a)+t`.
Apply half-open integer tile/backing ownership checks. This avoids independent endpoint rounding
per tile; full-tile quads remain a small fixture diagnostic only.

CPU routing uses the same f32 page/placement values with conservative max-radius bounds. Prove
its endpoint/radius arithmetic enclosure against the existing0.07px placement envelope and
the margin2−1.414214; add a derived finite f64 outward allowance, not a new geometric tolerance.
Unknown/nonfinite/uncertifiable bounds choose complete fallback. Work-area estimates include
outward error before floor/ceil. Integer vertices lie within0..8192, but clip conversion and
raster precision must also keep combined edge uncertainty below0.5px. Fragment ownership cannot
repair a missing pixel center. Existing quarter-pixel and AA tolerances remain unchanged.

### First-checkpoint numerical admission

The first implementation uses scalar outward binary64 intervals over the exact uploaded f32
operands. Widen CPU arithmetic to adjacent representable endpoints before adding shader error.
Use a conservative1ULP allowance for shader additions/multiplications,2ULP for inverse square
root and3ULP for division. ULP bounds include the next binade at an interval boundary. Enclose
all permitted affine evaluation/contraction orders, scale, radius multiplication, radius+2 and
endpoint subtraction/addition before floor/ceil. Zero is supported explicitly; uncertifiable
underflow, overflow, nonfinite values or cancellation choose the complete path. Initially admit
the scale squared-sum only inside `[2^-60,2^60]`; bracket square-root endpoints with outward
square checks. No reliance on Math.hypot matching shader rounding.

For the actual clip expression `p/viewport*2-1`, derive clip error Ec with the same operation
rules. Require highp precision of at least23 bits and SUBPIXEL_BITS at least4. Integer atlas
vertices remain inside0..8192. The lead adopts an explicit conservative implementation model
with per-operation fixed-function relative error e=2e-5: propagate division by1, viewport scale
and translation outward, and verify they fit `D*Ec/2 + 4*e*D`. Admit only when this bound plus
one whole subpixel quantum is strictly below0.5px on both axes. In particular, this initial model
does not admit8192-pixel axes; complete rendering remains available there.

This fixed-function model is an engineering premise with a safety margin over
[OpenGL ES3.0.6 section2.1.1](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf)'s
approximate accuracy statement, not a claimed normative IEEE guarantee.
[GLSL ES3.00 sections4.5.1 and8.5](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf)
supply the shader-operation premises. Keep the model explicit
in source review and validate the supported implementation with exact full/sparse browser pixel
comparisons before enabling the optional route. Unsupported precision or failed bounds select
complete rendering, never wider artwork tolerance. A tested device corpus is not every-GPU
acceptance. The projection/quad error must separately fit the existing `2−1.414214` guard.

## Composition, fallback and failure

All capsules for a logical group MAX-union into its assigned G slots. One destination tile has
one slot across all pages. Expanded routing supplies edge contributors; destination tiles remain
disjoint, so final source-over applies once in paint order without repeated opacity.
Each group starts with zeroed G after previous presenter readers validate: clear normal coverage
or packed G alpha only. Prior-group atlas coverage cannot survive into the next group's MAX.

Rewriting a geometry route bank as the slot-to-destination presenter table requires its geometry
readers to validate first. In the conservative one-page path, the second bank may instead hold
the presenter table if it is already free of all previous readers. Keep the first bank and its
geometry allocation immutable; ordered commands in the same WebGL context may then issue G
geometry followed by S presentation without an intervening validation wait. This introduces no
third bank, fence or permission to reuse G early. Mark composite-issued before the first S write;
any error discovered afterward discards the candidate instead of replaying over partial S. Both
banks, source geometry and G remain owned through their actual last readers, and every part must
validate before publication. The next group clears/reuses G only after presenter readers validate.

For destination integer pixel d, fetch source `s=d−t+a` with integer
`texelFetch(G, (s.x,H−1−s.y),0)`. No normalized UV sampling or sampler/write alias is allowed.
Normal G reads red; packed G is its independent alpha mask. Presenter writes S RGB only in
packed mode, preserving live alpha, with ONE/ONE_MINUS_SRC_ALPHA and existing group opacity.
G coverage already includes group opacity: emit group RGB multiplied by that coverage and use
the coverage as alpha. Never multiply by group opacity a second time in the presenter.
Issue at most16 tiles/draw and64 tiles/slice, under the same time budget. Mark composite-issued
before the first S write and validate every part before publication. G stays owned through its
presenter readers, independently of route-bank/geometry retirement.

Before any S write, optional slot/route/work/arena failure retires sparse readers, clears all G
and replays this exact group once through the complete path from its captured Prefix. Prior S
groups remain intact. No later group passes it; no reset/retry of sparse at the next page.
After any S write may have issued, cancellation/error is M03's ambiguous-composite path:
discard/rebuild or bounded recovery, never full replay over partial S. No acknowledgement of
incomplete pixels, new receipt cap, silent omission, unlimited queue or per-frame allocation.

## Required checkpoint

CT-02/03/04/06/07/08; INV-01/02/04/08/09/11; SU-03/04/13/14/16; SEC-03/09/13.
The M04 writer owns real-browser fixture/E2E cases, strict types/build/generated-boundary and
format/source-size checks. Fresh review audits numerical/ownership/failure claims; rendering
review measures frozen builds only after correctness. No standalone unit/tool test suite.

| Scenario | Positive and negative evidence |
| --- | --- |
| MIG-TILE-01 |1/2/3/1023/1024 capsules, strides1/2/4/1024, odd/empty spans, split cohorts, poisoned sentinels; full/full-tile diagnostic/tight sparse parity, thin/taper/wide/translucent tile edges, both formats, axes63/64/65/odd/8191/8192 |
| MIG-TILE-04 | Every work/slot/entry bound−1/bound/+1; partial useful G then one fallback, prior S preserved; no quota or repeated attempt |
| MIG-TILE-05 | Same/different page loans, both eviction paths, compaction, two fences and future descriptors; warm zero geometry uploads, mode/divisor restoration, exact allocation/retiring accounting |
| MIG-TILE-06 | Failure before/after upload/draw/presenter, null fence, context/fatal/resize/Back; no stale release or partial ack; M03 sealed C→D→E, packed copyback and Escape regressions |

Start with one page/two spans/four slots in both formats, then boundaries. Stop on a phase,
lifetime or parity failure before timing. Compare full-only/tight sparse on thin, overlapping,
dense/thick, warm/cold1024×768 and4096×2048 plus M03 long/capacity workloads. Keep current
absolute and relative performance gates. Separately report routing/fragment work, full-G clear,
presenter/copy bandwidth, uploads, pins, total allocation and complete acknowledgement.
Readback stays outside timing. A low hit rate or failed-attempt-plus-replay cost is a measured
limitation, not hidden by the complete fallback. No physical-Wacom claim follows from timers.
