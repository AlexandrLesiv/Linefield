# Web rendering R2 — incremental repaint and retained coverage

2026-10-19. **R01 approved and investigated; tested candidate rejected.** Parent: P05-E02.
Owner request: an executable web technical recommendation following manual testing of the
isolated worker preview. This is the current proposal, not a replacement for approved WMP-C2.
The owner approved proceeding with the staged recommendation. R01 stopped on its first
coincident-input union, which did not return before the watchdog. See P05-R01 for the current
finding. R02–R04 remain conditional and must not execute this failed mechanism. The technical
outline below identifies the investigated candidate and still-unimplemented responsibilities;
no production rendering contract has been replaced.

The owner subsequently approved [P05-R05](../../tasks/P05-R05.md) as the next isolated
checkpoint: compare existing CanvasKit CPU/GPU rasterizers with unchanged shared geometry,
returning results before production implementation. It does not revive the failed union
mechanism or authorize the conditional capture/cache work below.

## Recommendation and evidence boundary

Keep shared Rust geometry/editing and one CanvasKit worker. First test whether Skia PathOps
can maintain a compact filled-area union of incoming contours without changing the rendered
stroke. Then use local repaint and a bounded raster tile cache for completed artwork and
surrounding coverage. Preserve one stroke per Undo and the current UI. Do not add a second
CanvasKit heap, a Canvas2D brush engine or sample/shape approximation. The proposed derived
union and retained raster tiles are material amendments requiring owner approval; they are
not covered by the earlier whole-path/vector-cache-only direction.

The isolated worker app at `81fc2fc` keeps the UI available but reconstructs old strokes and the
active prefix in successive jobs. Its 4096-verb transfer pages eventually become one complete
path draw per stroke. The earlier dense 65,537-sample checkpoint measured 345.7 ms worker drawing
and 293.7 ms Begin-to-submission including 288.3 ms queue wait. These are bounded fixture timings,
not physical latency or a complete performance matrix. The owner then reported noticeable
drawing latency and only partial panning improvement during manual review.

Canonical geometry emits a disc plus, where needed, a tangent quad per sample. A typical
65,537-sample stroke approaches 720,902 verbs. Moving an indivisible operation to another
thread does not make new ink pass it. Prepared-path reuse helps warm cases but previously
failed cold/evicted cases; another unchanged whole-path benchmark would not test a new idea.

Spatial subdivision alone cannot solve the concentrated case: all contours may intersect
one minimum rectangle. That structural limitation is already known and is not the experiment.
R01 instead tests incremental Boolean union reduction, including the cost of the union itself,
using existing geometry exports before introducing any new shared API.
Its numerical parity and speed are uncertain. If it fails, stop and return evidence before
building the scheduler/cache around it. No unconditional speed or universal complexity claim.

| Candidate | Recommendation |
| --- | --- |
| Incremental work, one CanvasKit worker, retained surrounding tiles | Preferred staged candidate: preserves the selected renderer and avoids a second heap; correctness and bounded work still require proof |
| More overscan without reducing individual drawing jobs | Useful for temporary pan coverage, but cannot prevent fresh ink waiting behind a long draw |
| Canvas2D live ink plus CanvasKit committed rendering | Defer: rational conic representation, antialiasing and commit parity require another contract; changing API does not by itself remove scene reconstruction |
| Second CanvasKit worker | Defer: duplicates context/heap/resources and still shares GPU capacity; it does not fix cold reconstruction cost |

## Authority, baseline and work coordination

Read current AGENTS.md, tasks/README.md, objectives, contracts, WMP-C2, its numerical,
rotation and live-pan amendments, WMP-D3 and P05-E02 performance profile v1.
Known source references, not verified current-main claims:

- `.worktrees/p05-e02-memory-pen` at `dae539e`: retained original app, preview 65142.
- `.worktrees/worker-manual-preview` at `81fc2fc`: experimental app, preview 65145.

Both previews remain unchanged during planning and isolated investigations. The root checkout
contains unrelated uncommitted task work and stale ancestry; preserve it. Verify integration,
active writers and the tested source before any new task starts. One writer per confirmed
leaf task, one branch/PR per task; owner reviews and merges. Coordinate shared Rust paths with
S04-M01 if macOS work starts. Native progress does not approve this web architecture or vice versa.

## Ownership and proposed architecture

| Area | Shared Rust authority | Web host / renderer mechanism |
| --- | --- | --- |
| Input and history | Admission, samples, pressure, settings, End/Cancel, Undo/Redo | Browser events, existing input adapters and presentation |
| Geometry | Existing discs/hulls, exact regional math, conservative bounds, paint order | Validate/copy generated geometry; derived PathOps union and disposable paths, never canonical edits |
| Incremental work | Finite prefix identities, chunk descriptions, damage and contributor queries | Request affected areas; schedule and retain derived resources |
| View and coverage | Mapping, rectangle projection, affine/coverage validation, exact acknowledgement | Compose images and request visible/margin work |
| Lifetimes | One main-thread editor; authoritative validity checks | One worker owns all CanvasKit resources; main Canvas2D only presents images |

Data flow: browser input → Rust acceptance → dirty-area/geometry queries → single worker
bounded repaint → candidate image + exact identity → Rust validation → main bitmap submission
and Rust acknowledgement. Preserve the approved presentation transaction: validate identity
and coverage before composition; submit/acknowledge synchronously without an intervening
await or callback; retain the prior coherent source until acknowledgement succeeds and restore
it if acknowledgement rejects or throws. Rust never waits for file/GPU work. No second document owner, raw Wasm
memory view, shared memory, new network service or generic command protocol is introduced.

Keep the committed background and current-stroke coverage separate. New samples invalidate
only their conservative affected area. Reconstruct that area from the relevant geometry;
do not repeatedly source-over newly antialiased discs onto earlier antialiased discs.
Rendering requests may coalesce; accepted input and semantic End/Cancel/Undo obligations may not.

## R01: prove compact union and repaint before the architecture

The existing contract explicitly requires one antialiased nonzero fill per stroke and forbids
separate segment draws. R01 proposes a narrowly scoped amendment for investigation only:
combine same-stroke contours with CanvasKit `Path.MakeFromOp(..., PathOp.Union)` before filling
the result once. The pinned 0.41.1 declarations expose `MakeFromOp`; runtime availability is an
entry check, not assumed from current upstream. Use Intersect with an expanded local rectangle
where needed to constrain the accumulator. Skia PathOps produces a derived outline of the
filled area, not edited samples or a new semantic stroke. Its floating-point curve operations
can affect raster output: source-level mathematical equivalence alone is not acceptance.

Candidate algorithm:

1. Script a finite accepted prefix in the isolated browser fixture; pause semantic mutation
   while copying existing `StrokeState`/`ScenePage` exports with their scene/token checks.
   Use the exported viewport-projected f32 coordinates unchanged for candidate and reference.
   No new Rust capture/index/query API or tile-origin reprojection is needed for R01.
2. Use 128×128 backing-pixel renderer clip regions plus the candidate support halo. A full
   geometry scan can supply complete contributors in this experiment. Report scanning,
   copying and preparation costs separately; this does not establish production query speed.
3. Feed at most 1408 verbs per union operation, ending only at complete-contour boundaries.
   This transport grouping is not a claim of 128 samples. For each stroke/area,
   compute the union of its retained derived outline and that group's filled geometry.
   Intersect with the halo rectangle; fill the resulting outline once. Never blend separately
   antialiased new discs into old edge pixels. Completed strokes retain original paint order.
4. Clear and reconstruct the affected scratch interior from its committed base and active
   union, then replace only the disjoint interior. Retain the prior accumulator until the new
   operation succeeds. A null/invalid result is a candidate failure, not empty paint.
5. A derived outline exceeding 4096 verbs is a complexity warning: subdivide into 64×64 then
   32×32 interiors and rebuild the affected accumulators in bounded input groups. If the
   minimum interior or the subdivision/rebuild cannot meet the latency gate, fail. Do not
   discard contours. Both Boolean preprocessing and raster/export costs count.
6. Compare against the unmodified whole-path reference outside timed measurements. Start
   with coincident/retraced 256/1024/4096 samples, then the 65,537-sample case and continued ink.
   Stop at the first decisive failure before running a full acceptance matrix.

The halo is an explicit research result, not an assumed one-pixel constant: assess candidate
1/2/4-backing-pixel guards against CanvasKit rasterization and the existing sampling policy.
If none preserves the reference, fail. Query uncertainty broadens candidates or returns a
typed failure; an unfinished query is never an empty region.

R01 must include a deliberately concentrated long stroke for which all original contours
overlap one minimum rectangle. The hypothesis is that coincident/interior boundaries disappear
from the derived union, not that a smaller rectangle removes contributors. Also test genuinely
complex local boundaries for which union remains large. PathOps is itself nonpreemptible;
bounded input groups do not prove bounded operation time or allocation. A slow Boolean union
is the same scheduling failure in a different place. Rebuilding cold/evicted accumulators
must meet full-frame deadlines too; warm-only success does not unlock production migration.

The first gate requires existing pixel/geometry acceptance and measured primitive feasibility:
target at most 4 ms per synchronous unit, with an 8 ms maximum investigation guard on the test
host. Include Boolean construction, rasterization and export rather than timing draw alone.
Report complete cold reconstruction as well; exceeding profile v1's applicable full-frame
deadline rejects the candidate. A pass only supports the next contract/design stage, not
live-input, queue, capture-race or full performance acceptance. Those require R02/R04.
Freeze the exact parity oracle/tolerance before running; use exact same-backend byte comparison
for cases with an existing exact reference. Any proposed new tolerance returns to the owner.
Corpus: coincident/contained discs, pressure jumps, tangencies, retracing/self-intersection,
chunk joins, fractional translation/zoom, rotation, thick paint, DPR 1/2/4, patch edges, multiple
colors, plus the existing dense and sparse 65,537-sample failures. A fast but visibly changed
stroke is a failed candidate. Passing sampled cases is not a proof over arbitrary inputs.

If this fails, return the exact parity/timing/complexity evidence. A sampled coverage-mask
backend, changed raster tolerance or alternate-renderer comparison requires a new proposal;
none is an automatic fallback or included in these four proposed tasks.

## Proposed typed Rust boundary

R01 uses existing exports. Concrete new signatures below are deferred until its results,
then frozen with owner approval before R02/R03 implementation.
Use existing wasm-bindgen readonly snapshots, checked u64/bigint identities, copied arrays,
symbolic failures and explicit disposal. The following names/shapes are the review proposal:

| Operation | Result and contract |
| --- | --- |
| `memoryRenderCaptureCommitted(owner, session, mapping)` | Finite committed scene descriptor |
| `memoryRenderCaptureInk(owner, session, interaction, mapping)` | Finite active prefix plus exact committed predecessor |
| `memoryRenderChunkIds(owner, session, capture, cursor)` | Up to 128 ordered chunk descriptors; resumable cursor |
| `memoryRenderChunk(owner, session, capture, chunk)` | Existing complete-contour verbs/points/weights; no raw samples |
| `memoryRenderQuery(owner, session, capture, rect, cursor)` | Conservative contributors for a captured screen rectangle plus reviewed halo |
| `memoryRenderDamage(owner, session, fromContent, capture)` | `none`, conservative rectangles, or `full` |
| `memoryRenderInkDamage(owner, session, fromInkPrefix, capture)` | Damage between accepted prefixes of the same active stroke; distinct from committed content revision |
| `memoryRenderValidate(owner, session, capture, frame)` | `exact`, `transformable`, `stale`, or `incomplete`, with Rust-derived affine/coverage |
| `memoryRenderPresented(owner, session, capture, frame)` | Acknowledge only an exact current submitted frame |
| `memoryRenderRelease(owner, session, capture)` | Release only the matching capture, never a newer one |

Named rectangle/frame fields use generated typed records or named scalar parameters, not a
handwritten serialized command packet. Rectangle edges are bounded signed integer backing-
pixel coordinates relative to the captured raster grid; Rust converts to regional geometry.
The approved halo belongs to the Rust render profile, not a caller-controlled clipping escape.
Validate all bounds before copying/allocating. Freeze actual generated signatures for owner
review before new ABI code; approval of this conceptual table is not that freeze.

Local conversion must preserve the approved numerical order. Current geometry narrows once
after viewport-relative translation. Subtracting a tile origin before that narrowing can
change the result. Rust must specify reference-compatible rounding and tile-local conversion;
the host never reprojects canonical coordinates. Include round-then-translate versus
translate-then-round boundary cases before R03 tile-local projection. R01 uses the original
viewport projection unchanged. A changed order requires an identified numerical
amendment, even when its ideal real-number equation is equivalent.

Identity includes module lifetime, owner/session, content revision, stable stroke/geometry
identity, exact sample endpoint, projection and surface epoch. A chunk is at most 128 samples
(at most 1408 verbs), owns its discs and the hull to its predecessor, and ends at complete
contours. Stable geometry identity is independent of projection; projected cache keys are not.
Sealed chunks never grow; open tails are keyed by their exact captured endpoint.

Recommend at most two lightweight captures: foreground ink and committed reconstruction.
They reference canonical samples, not full scene copies. Later append does not extend a
capture. End may promote a matching completed prefix; Cancel, branch truncation or removed
geometry invalidates it. Stale queries return no geometry and no cursor advance. Retain one
live copied snapshot, one outstanding transport credit, and two reusable 256 KiB buffers.

Spatial index: Rust-derived stroke/chunk bounds containing complete discs and connecting
quads, using current regional/outward-rounding rules. Start with a bounded hierarchy over
sealed chunks; an open tail has separately refreshed bounds. Query ceiling proposal:
1024 index-node visits or 128 returned descriptors per call, then continue. Query/page time
must still satisfy measurements; a count bound is not a time guarantee. Cache allocation
failure can fall back to bounded scanning without losing artwork; performance may fail.
Maintain or rebuild the index incrementally in measured bounded units. Do not introduce a
whole-document scan into Append, End, Undo or the main-thread input callback. Index maintenance
and damage discovery count toward their actual command/input timing, not an excluded setup cost.

Damage uses one bounded last-transition descriptor initially. If the caller's predecessor
matches, return old/new painted extents. If revisions were skipped, mappings are incompatible
or bounds cannot be proved, return `full`. No unbounded damage journal. History retirement
must not remove visible artwork from the index; keys use identity, not array position/count.

Active damage needs a separate `InkPrefix`: owner/session, committed predecessor, interaction,
geometry identity, exact accepted sample endpoint and projection. Append leaves content
revision unchanged. Equal prefix returns none; a valid earlier endpoint of the same immutable
stroke returns bounds of all newly accepted geometry, including the connecting hull. An
initial/missing prefix returns full active damage; an incompatible content/mapping returns
full reconstruction; a cancelled or different interaction returns stale, never another
stroke's damage. A skipped valid prefix remains queryable from canonical samples. Range-bound
enumeration is resumable and complete only at done; no history-sized damage log is needed.

## R02: incremental ink and scheduling, conditional on R01

Keep one CanvasKit worker and one context. Measure every synchronous unit including path
construction, draw, flush and bitmap export; yielding only between pages is insufficient.
Proposed scheduling target is 4 ms per unit, with 8 ms worst-case feasibility guard on the tested
host. These are new engineering targets for approval; profile v1 still governs acceptance.
R02 uses resumable bounded contributor scans; R03 adds the spatial index. Replace remaining
whole-path draws with the proven bounded operation too, so background reconstruction cannot
still monopolize the worker. R02 gates input/ink/main-thread metrics; R03 targets pan/Undo;
R04 requires the complete performance profile on the integrated app.

Priorities: lifecycle/cancel/failure fences first; new live ink; missing visible committed
coverage; committed maintenance; optional margin/cache work last. Re-evaluate between units.
When both ink and mandatory committed work exist, alternate up to two ink units then one
mandatory unit; a semantic prerequisite for the next coherent preview takes precedence.
Tune only within the approved visible-ink deadlines. Record oldest pending accepted prefix
and mandatory-work age so priority cannot hide starvation. Bound GPU work in flight through
measured submission pacing; main-thread responsiveness alone is insufficient evidence.

Maintain one latest camera request and one latest ink request, not a frame queue. Dirty
regions coalesce in a bounded grid of outstanding interiors; too many regions promote the
request to a full extent. A full extent is still processed in proven units, not a giant draw.
At most one unadopted output batch exists. Before yield, finish/free mutable native builders;
retain immutable prepared paths only under the optional cache allowance.

Publication must represent the whole visible committed prefix plus a stated active prefix.
Dirty scratch patches are private, never partially published as a mixed history revision.
Publish a batch only after every patch needed for that coherent prefix is ready. Count all
time spent waiting for the batch in input latency. Independent pan patches may refine coverage
only when they represent the same content and mapping-compatible view.

End A → Begin B: Rust commits A and admits B on an acknowledged unchanged mapping immediately.
An explicit Rust End receipt relates the completed active prefix to its committed stroke
identity; the host cannot infer promotion from equal pixels, point counts or array positions.
Freeze that receipt with R02's capture/lifetime contract.
Promote A's complete, exact raster contribution into the committed backing when available;
otherwise finish A's mandatory remaining work before publishing B over it. Keep no unlimited
list of completed overlays: retain a single committed target endpoint and derive missing
work from Rust. Promotion is a raster/compositing operation, not regeneration of all strokes.
This dependency must meet the same ink deadline, including rapid repeated Ends; otherwise fail.
Cancel B discards B and restores the A-only backing. Late B results are rejected. Never drop
A to make a newer preview appear sooner or draw A twice during promotion.

## R03: continuous coverage, retained raster cache and Undo

Recommend 256×256-backing-pixel disposable raster tiles for the committed scene, with local
PathOps outlines/prepared geometry cached separately. This explicitly amends the earlier
vector-cache-only/whole-frame direction and needs owner approval before R03. Tiles are renderer
derivatives, not a new document format. Their 256 px size is an initial allocation choice;
R01's smaller repaint units remain the scheduling boundary within a tile.

Rust issues a `RasterGridId` for a captured zoom/angle/backing scale and regional anchor,
opaque tile IDs, tile-local geometry and tile-to-current-view transforms. Browser code does
not compute world tile coordinates. Translation-only pan can reuse that grid within validated
regional bounds. Zoom/rotation/backing changes establish a new grid. Include grid identity,
content/paint order, style/geometry version, tile interior/halo and worker epoch in cache keys.
Fractional phase changes may use old images only as transformed previews; exact-current
acknowledgement requires the reference-compatible phase/grid. No implicit coordinate snapping.

Request actual Rust geometry for up to 25% viewport width/height beyond every edge and the
corners. Allocate separate tiles rather than one oversized surface, so maximum legal viewport
size does not inherently force zero surrounding coverage. Keep each allocation within current
surface limits and allow up to 48 MiB of additional surrounding RGBA tile pixels. Reduce the
guard uniformly if that optional allowance or actual resource availability requires it; never
reduce DPR or omit required visible artwork. Warm zero-hole claims require a prepopulated
adequate guard. Zero-margin mode is a degraded coverage condition, not a passing equivalent.

During pan, transform retained grid images with Rust's affine. Schedule newly exposed visible
tiles before refreshing the margin. Request replacement guard tiles when remaining directional
coverage falls below half its selected width; do not wait for pointer release. Rust validates
the union of actual tile interiors covering the viewport, including rotated/fractional edges;
a bounding box around disconnected cached tiles is insufficient. Halo pixels are not counted
as valid interior coverage. Keep old compatible tiles until replacement preserves every
currently represented visible region. No repeated resampling of a resampled preview. Keep
exact readiness separate from transformed-preview coverage.

Finite padding cannot promise gap-free arbitrary pan speed or cold jumps. Proposed warm-pan
acceptance trajectory: two seconds horizontal, vertical and diagonal at 0.5 and 1 viewport
width/height per second, then reversal and acceleration to 2 viewports/second; run at 10%, 100%,
800% and rotated views. Measure unsupported visible area and time-to-correct-coverage, not
only callback/frame frequency. Warm 0.5/1 trajectories must show no background holes where
reference artwork exists. The 2× and cold cases must report holes and meet the existing full
frame deadlines; if the owner requires zero holes there too, a different cache/quality plan
may be needed. This bounded coverage profile is an approval item, not a universal guarantee.
Keep existing nonblocking updating semantics while incomplete; never acknowledge unknown
coverage as complete/empty artwork. No new placeholder, blur, quality reduction or loader.

Undo removal dirties the old stroke extent; repaint all surviving contributors in order.
Redo reuses prepared geometry when available. An Undo spanning every visible pixel may still
require a full extent, processed in bounded units. Keep old coherent output until the new
visible revision is complete, then replace atomically. Rust accepts later commands normally;
obsolete render work cannot publish. Cold/evicted parity and latency are required, not optional.

## Memory, queues and failure

Existing soft monitoring targets remain 320 MiB CPU (CanvasKit 256/Rust 32/JS 32) and 96 MiB graphics.
No fixed stroke quota, admission cutoff on target excess, or changed Undo retirement policy.
Optional prepared geometry starts with a 16 MiB attributed allocation allowance shared with
index/render caches, released oldest-unused first. Account actual Rust/JS allocation and
CanvasKit heap plus attributed backend objects; a cache's nominal size is not total heap use.

Before R02/R03 implementation freeze the actual surface/image lifetime diagram. Proposed
conservative named backing envelope is `5V + G + 4T + 2S`: V is the visible RGBA area,
G surrounding committed tiles (up to 48 MiB), T one haloed 256 px transport tile, S one haloed 128 px
scratch. Five V-equivalents cover visible committed tile interiors, an incompatible-revision
candidate set, active-stroke coverage, main visible canvas and main coherent-composition canvas.
Candidate sets initially cover the visible area only; their guard is built after adoption,
so the envelope does not contain a second G. Retained active outlines/images do not imply a
full bitmap per document stroke. No bitmap queue for completed strokes. Four T slots reserve
worker export, transferred candidate, prior tile retirement overlap and one uncertain copy.
At most one transport tile is unacknowledged. Stream it into the separately accounted candidate
set/coherent composition canvas, close its transferred image, and return credit before the
next transfer. One pending coherent publication may contain many already-staged tiles; it does
not retain another unaccounted image per tile. Every slot is accounted at ownership transfer.
Share storage only when verified and free old candidates before another revision starts. Add
halo overhead for every resident tile, stencil/MSAA/driver overhead and outline caches: these
are excluded from the table below and require measurement, not assumed-zero allocations.

| Backing profile | V | Ideal 25%-edge guard G | Named 5V+G subtotal before tile rounding/halo/transport/scratch/driver/cache |
| --- | --- | --- | --- |
|1024×768 |3 MiB |3.75 MiB |18.75 MiB |
|4096×2048 |32 MiB |40 MiB |200 MiB |
|4096×2048, 100% each edge, illustration only |32 MiB |256 MiB |416 MiB; outside proposed optional guard allowance |

One 128×128 RGBA scratch is 64 KiB before halo; one 132×132 is 68.06 KiB. With a 2 px guard,
four 260×260 transport backings plus two 132×132 scratch backings add about 1.165 MiB.
Partial edge tiles, GPU row alignment and per-tile halos increase the subtotal further.
The largest profile exceeds 96 MiB; this remains a soft target, not automatic rejection. The
extra retained cache/lifetime model requires explicit approval and measurement before adoption.

Crossing a soft target triggers measurement and reassessment, not automatic removal of the
guard: mandatory backings already exceed 96 MiB at the largest profile. The separately proposed
guard allowance may remain above that target when allocation and measured operation are safe.
Release stale outputs and unused prepared resources first. On an actual resource-pressure
signal or allocation problem, stop speculative work and reduce optional coverage uniformly;
report the resulting degraded coverage. Preserve canonical samples/history. Required visible
work may exceed the soft target. Actual allocation/context/worker failure uses existing localized
display failure and explicit Retry, cancels only unfinished input through Rust and preserves
committed work. Retry fences the old worker/surface epoch and reconstructs the same owner.
No assumption of a browser/OS warning before process termination.

Same-origin worker, validated message tags/IDs/array lengths/finite coordinates and monotonic
request IDs; no code payload, new external service or shared memory. One credit limits bytes
in flight. Duplicate/stale replies close transferred images and cannot revive cancelled work.
Queries do not log samples/coordinates. Correlated diagnostics expose durations, counts,
generations and failures only, with bounded storage and no per-sample production logging.

## Acceptance and execution gates

Retain performance profile v1 exactly:

| Metric | Limit |
| --- | --- |
| Input/Rust/copy | p95 ≤4 ms; maximum ≤16 ms |
| Main-thread uninterrupted rendering | p95 ≤8 ms short; ≤16 ms long/many; every app task <50 ms |
| Accepted input → complete preview submission | p95 ≤33 ms short/50 ms long or many; maximum ≤100 ms |
| Pan/zoom/Undo/Redo → complete acknowledged frame | p95 ≤100 ms warm/250 ms cold or evicted; maximum ≤500 ms |
| Final pan update/release → drawing availability |≤250 ms |

Workloads: 32-sample strokes; 65,537-sample continued stroke; 1024×64-sample strokes, each at
1024×768 and 4096×2048. Include warm/cold/evicted, dense overlap and broad offscreen trajectories.
Five release runs plus untimed warmup; ≥100 observations per metric/cache condition for p95.
Report each run separately, event-delivery delay, superseded requests, queue age and worker
blocking. Same-host regression exceeding both 15% and 2 ms requires investigation. An early
decisive failure can stop the experiment; it cannot establish a full performance pass.

E2E scenarios: WMP-INC-01 exact geometry/prefix boundaries;02 delayed A/B cancellation;
03 stale capture/presentation;04 Undo/new branch/retirement;05 AA/patch parity;06 coverage,
rotation/remap/reversal;07 allocation/index/worker/context failure;08 measured scheduling.
Map CT-01–04/06–09, INV-01–05/08/09/11, SU-03/04/07/13–18/20 and SEC-02/03/09/13.
Actual application E2E remains distinct from renderer fixtures; both are browser E2E lanes,
not new unit/developer-tool suites. Pixel captures are outside timed intervals. Wacom and
physical pen-to-display latency require separate manual/native evidence and focus permission.
Preserve gallery, Back/Resume, en/uk, themes, fields/IME, accessibility and existing controls.

## Task sequence and current execution gate

1. [P05-R01](../../tasks/P05-R01.md): compact-union/repaint parity and timing feasibility. Stop and return results.
2. [P05-R02](../../tasks/P05-R02.md): incremental worker scheduling and frame handoff, only after R01.
3. [P05-R03](../../tasks/P05-R03.md): actual guard-region coverage, retained geometry and Undo damage.
4. [P05-R04](../../tasks/P05-R04.md): full actual-app acceptance and reviewed web migration.

Each task requires its scope/order confirmation before starting; later tasks are conditional.
The owner approved R01 first, including the derived PathOps union/local repaint experiment
and stop-and-return. The tested grouping strategy failed at its first union; R02 cannot
proceed on that evidence. R01 reused existing Rust exports and introduced no new ABI. Two captures/
scheduler, retained raster tiles, full coverage policy and production rollout remain later
approvals, informed by R01 evidence. No reopening of pen,
storage, platform, localization or history product choices is needed.

## Supporting primary references

- [Xournal++ incremental stroke mask](https://github.com/xournalpp/xournalpp/blob/master/src/core/view/overlays/StrokeToolView.cpp): new-point work and retained endpoint; mechanism reference, not Linefield parity evidence.
- [Excalidraw new-element canvas](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/components/canvases/NewElementCanvas.tsx): separate active presentation; no proof of preemption.
- [Konva layer/caching guidance](https://konvajs.org/docs/performance/All_Performance_Tips.html) and [PixiJS cache tradeoffs](https://pixijs.com/8.x/guides/components/scene-objects/container/cache-as-texture).
- [MyPaint affected-region updates](https://www.mypaint.app/en/docs/backend/canvas/): raster-document reference only; no adoption of its storage model.
- [SkPicture](https://api.skia.org/classSkPicture.html): command recording/replay does not itself guarantee cached raster cost.
- [Skia PathOps](https://skia.googlesource.com/skia/+/81de4113e3e7cfe8ec91413fbbe51101dcb354e3/include/pathops/SkPathOps.h): filled-area union/nonoverlapping contours; not a numerical or latency guarantee for this use.

Reviewed sources are mutable upstream references accessed 2026-10-19. No comparative library
benchmark or third-party code import has been performed. Research informs this proposal;
specialist/designer/independent review never substitutes for owner approval. The Rust and
design reviews support the responsibility split and existing UX; independent review found
no remaining structural blocker to the narrowed R01 owner handoff. This is proposal review,
not measured feasibility, code review or approval of the conditional later implementation.
