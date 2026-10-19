# WMP-C2 numerical candidate and evidence

Part of [WMP-C2](web-memory.md). Owner G1 requires pan/zoom; G2 approves screen/surface
limits, G3 precision/normalization policy and G4 swept-disk geometry. Concrete zoom-aware
mapping algorithms and new ABI details below remain engineering recommendations needing
review/evidence. This source also describes the earlier fixed-view diagnostic; its
observations are not pan/zoom validation. Generated observations stay in ignored `.build-cache`.
Owner-confirmed S02-W01 permits this bounded synthetic investigation only. It is not an
E2E suite, Rust editor, production arithmetic adoption, renderer or benchmark.

## Approved screen limits and remaining pan/zoom admission

For each axis require exact logical canvas offset `canvas − extent/2` in[-8192,8192].
Extent[1,8192]; division by2 is exact in this normal range. Check this bound on the exact
dyadic difference before rounding. Captured off-canvas points are admitted within the
envelope; outside cancels current stroke atomically, never clamps. G2 approves this screen
envelope, not a fixed world-span bound valid at every zoom. G1 requires Rust viewport
pan/zoom in[0.1,8]; original stroke scale remains1, with selection scaling excluded.
Neither viewport nor sample addresses are restricted to origin-adjacent regions. No
finite page or fixed document stroke/sample quota follows from these screen bounds.

Recommended semantics for each axis: `world=center+(canvas−extent/2)/zoom`, all supplied
binary64 values interpreted exactly, then V4-B normalization before acceptance. Pan uses
captured base center/zoom and start/current points, deriving every preview from that base;
cancel restores captured viewport, never document history. Anchor-preserving Zoom derives
new center from the old world position under its anchor and the new zoom. Center-anchored
UI steps simplify this to unchanged center, but do not make inverse input division dyadic.
Do not flatten region integers to Number or substitute unreviewed f64 operation order.

Because zoom is fixed throughout an ink interaction (pan/zoom rejects while ink is active),
the screen envelope implies a conservative pre-normalization per-axis stroke span<=163,840
world units at minimum zoom. Add normalization allowance for accepted samples; this is a
derived spatial bound, **not** a lifetime sample-count limit. Panning between strokes can
place different strokes at any admissible regional address. C1 removes the65,536-sample
lifetime cap: per-call work stays bounded while resources, not stroke duration, govern growth.

Canonical samples remain regional i64+local f64[0,65536), +0. First sample is immutable
source/placement anchor. Original−source is evaluated with checked relative region
subtraction, never absolute Number flattening. With placement==source and scale1, evaluate
original relative to current viewport directly rather than subtract/add the source anchor.
First classify offscreen regional bounds using checked integer arithmetic; only narrow
relative coordinates for candidate-visible strokes after their magnitude is bounded. This
is needed after long pans to prevent large intermediate cancellation or f32 overflow.

Owner-approved precision direction uses V4-B: exact mathematical domain check, floor region/residue, nearest-even local
rounding (including65536 candidate), checked carry; reject a carry beyond maximum i64.
Do not saturate. Canonical accepted samples stay immutable. Derived geometry budget0.25
logical points after zoom is separate from this input normalization error<=2^-38 per
coordinate. Example regionMAX+local(65536−2^-40) rejects even though exact pre-rounded
position is in-domain; same residual atMAX−1 carries. Negative minimum subnormal borrows
and rounds/carries to+0. `(MAX,65536)` is out of mathematical domain before rounding.
Minimum-region negative displacement rejects even if nearest rounding could hide it.

Candidate `exact.rs` uses a **fixed19×u64 magnitude** at quantum2^-1074 plus sign. It
constructs exact region×65536 and two supplied floats, all bounded before decoding.
Maximum intermediate<2^80 occupies<1155 bits; capacity1216 bits. Checked wider quotient
uses i128 and converts only after mathematical-domain validation. Remainder extraction
and nearest-even rounding use integer bit/half/sticky inspection, including subnormals.
No heap big integer, floating rounding-mode dependency or global f64 coordinate. This
candidate is bounded but has not been measured in release Wasm input handling; it is
not selected production code. **It only adds dyadic operands; it does not implement division
by arbitrary binary64 zoom or anchor-preserving zoom.** Production may optimize only with equivalent exact semantics
and browser E2E boundary evidence, without importing this diagnostic binary into the app.

## Painted geometry definition

G4 approves this round swept-disk geometry direction. Numerical construction details and
actual CanvasKit rendering remain verification obligations, including zoomed views.

For present pressure p, effective diameter is width×(0.10+0.90×p); absent uses width.
The literal decimal formula denotes real values of validated binary64 inputs with decimal
constants1/10 and9/10. Proposed derived radius evaluates binary64 operations in this exact
order: t=9*p, u=1+t, v=width*u, r=v/20, each nearest-even, no fused contraction. Store this
derived radius once per sample. This sequence is not a correctly rounded evaluation of the
whole rational formula. Standard four-operation error bound with intermediate<=5120 gives
absolute radius error<2^-38 for the admitted domain; include it separately in the geometry
budget. No smoothing/quantization; pressure/width semantic inputs remain immutable.
Radius range0.05…256. Interpolate center and radius linearly between consecutive samples.
Stroke region is union of the discs swept along those linear segments. Same-position
duplicates retain both samples; painted union is largest disc there. Tap is one full disc.

For endpoints P0,P1 with radii r0,r1, if distance d<=|r0−r1|, larger endpoint disc covers
segment. Otherwise u=(P1−P0)/d, a=(r0−r1)/d, b=sqrt((1−a)(1+a)), normals
`n±=a*u ± b*perp(u)`. Tangent points Pi+ri*n±, endpoint discs and tangent quad form exact
swept segment. Quad contour order P0−→P1−→P1+→P0+ (never bow-tie); reverse as necessary
to match clockwise discs in right/down coordinates. One nonzero-winding path per stroke
unions all contours. No PathOps per sample or per-segment alpha compositing.

Compute direction with scaled components: m=max(abs(dx),abs(dy)); coincident if m=0;
ax=dx/m, ay=dy/m, q=sqrt(ax²+ay²), u=(ax/q,ay/q), d=m*q, with explicit nearest-even
operations/no contraction. Do not compute u=(dx/d,dy/d): at diagonal minimum-subnormal
displacement, rounded d becomes one minimum subnormal and yields u=(1,1), not a unit
vector. Renderer review found that counterexample; current corpus retains three diagonal
subnormal vectors and candidate avoids that division. The earlier outputs lay off the
endpoint discs; their collapsed quad was not evidence of a visible square. No visible
raster failure claim follows. Avoid `hypot`, whose Rust precision is unspecified across
platforms; candidate now uses explicit basic operations/sqrt and scaled normalization.

Represent disc as Move+four rational quadratic Conic+Close, control points at bounding
square corners and weight sqrt(1/2); endpoint control coordinates and weights narrow
once to f32 in Rust after viewport translation. Convex positive-weight conics avoid
sampling a fixed polygon that could exceed tolerance at large width. Rust computes all
geometry. Clip final filled path to canvas rectangle in CanvasKit; no centerline-only
culling. Two endpoints outside may cross screen, and an offscreen center may paint inside.
For eventual whole-stroke culling, per-axis swept bounds are extrema of endpoint center±
radius (both linear across segment), unioned across samples. Compute bounds outward with
the conversion/error allowance, then include the pinned renderer's measured AA fringe.
Only strict disjointness permits culling; touching/uncertain near-boundary bounds stay
eligible for drawing after proving finite conversion bounds. The old fixed-view fallback
of drawing every path and letting the surface clip does not apply after arbitrary regional
pan: conservative regional classification and the finite conversion envelope are prerequisites.
Do not narrow distant strokes to f32 or substitute endpoint/centerline culling while the
AA/fringe analysis remains pending. Cache identity uses geometry/mapping tokens, never locale/theme.

Numerical handling near containment: computing d and radius difference in f64 can select
the wrong branch. Diagnostic found `(0,0,.45,0,r0=.05,r1=.5)` as a concrete example: exact
binary inputs leave a tiny exposed hull, rounded comparison reports contained. Candidate
omits hull only at coincident centers or when `d<|delta|−8ε(d+|delta|)`; near threshold
retains a possibly degenerate quad with a clamped to[-1,1]. Discs always retained. This
clamp limits a derived unit normal at a numerically ambiguous boundary; it never clamps
input coordinates/pressure/radius or silently drops samples. A truly contained segment's
quad lies inside its endpoint-disc union. Corpus verifies no false omission and records
conservative extra hulls separately. The threshold remains a proposed arithmetic policy,
not a complete transcendental error proof or acceptance gate passed by these observations.

The **earlier fixed-view-only analysis** used world offset<=8192, canvas half<=4096,
radius<=256 and gave final coordinate
magnitude<=12544. Nearest-f32 coordinate error<=2^-11 per component, Euclidean<=0.000691.
Circle weight error<=2^-25 and positive rational denominator>0.8535; sensitivity bound
`1.415*r*weight_error` adds<0.0000108. Combined conic control/weight perturbation<0.000702
logical points, before tangent construction and renderer rasterization. At DPR4 the
same position error is<0.002808 backing pixels. These bounds apply only to that earlier
zoom1 setup; they do not certify the now-required pan/zoom profile. Near-tangent
sqrt conditioning, f64 radius construction, clipping/AA and workload require actual
release CanvasKit E2E as WMP-08/09/11. Production acceptance cannot cite only these bounds.

## Bounded engineering recommendation before pan/zoom implementation

1. Extend the reference to exact rational inverse mapping at zoom0.1,8, intermediate
   binary64 values and button-step boundaries. Decode operands exactly; compare accepted
   canonical bits/domain rejection after division and nearest-even normalization. Reuse
   existing rational reference sources where sound. Do not treat f64 round trips as proof:
   matching forward/inverse approximations can hide error. No new experiment is run here.
2. Recommend a bounded fixed-storage integer/rational normalization implementation for
   these finite operands, with explicit checked numerator/denominator capacity derived
   before coding. Input mapping has one binary64 zoom divisor; general anchored zoom may
   involve two. The old19-word addition candidate does not establish required capacity or
   latency. Compare this route with a proven expansion algorithm; select exact operation
   order only after the bounded evidence packet, not by adopting ordinary division silently.
3. Before f32 conversion, conservatively cull complete strokes by outward regional painted
   bounds. For an ink stroke captured at zoom>=0.1, its per-axis span remains bounded even
   when duration is memory-based. If those bounds meet the current viewport, maximum
   projected center span is roughly163,840×8=1,310,720 logical points; width radius after
   zoom is at most2048. This suggests a bounded render window below2^21 after exact
   intersection/normalization allowances. It is an **engineering envelope candidate**:
   derive the full outward bound, AA margin and cross-boundary cases before approving it.
   Under a proven |coordinate|<2^21 bound, f32 component rounding<=2^-4 and Euclidean
   error<=0.088389; conic weight error at radius2048 adds<0.0000864. These estimates leave
   room within0.25 logical points but are not total tangent/raster error evidence.
4. Require both axes, min/max i64 centers, tiny/negative local remainders, repeated base-
   derived pan, cancelled/stale pan, region crossings, min/max zoom, offscreen crossing
   segments, zooming old minimum-zoom strokes to8, and long strokes exceeding65,536 samples.
   Confirm normalization, clipping/culling, f32 geometry, bounded scheduling and coherent
   visible scene separately. Point probes alone cannot pass WMP-11 or browser E2E.

This recommendation retains regional representation, selected zoom range and Rust authority.
It does not reopen G1–G4, supply new production code, approve additional input gestures or
claim that the earlier fixed-view proof supports the required editor.

## Experiment and limitations

Run `node scripts/probes/web-memory/run.ts` from repository root. It spawns only the
isolated Cargo candidate with bounded synthetic stdin and120s timeout; output<=1MiB.
No file/network/user drawing input, no app import and no new dependency. Sources use
native Node TypeScript and dependency-free Rust. Cargo target/report are ignored under
`.build-cache/web-memory`; source Cargo.lock contains only the diagnostic package.

Earlier fixed-view corpus543 observations:315 normalization/mapping and228 painted segment cases.
Includes signed zero serialized explicitly, ±minimum subnormal,±0.1, half ties, safe/
overflow carry/borrow and all i64 extremes; mapping at selected widths; pressure-radius
extremes, duplicate/coincident centers, ordinary and near-containing segments, both-axis
large deltas and projected extrema. Origin0 boundary vectors preserve tiny deltas that
would disappear after addition to−8192. No random or exhaustive coverage claim.

Node oracle decodes every finite binary64 operand to exact BigInt dyadic, independently
forms global exact value, floors regional remainder and nearest-even rounding; compares
bit-identical Rust outputs/reasons. Painted containment compares exact rational squared
distance to exact squared radius difference. Radial residual uses exact rational squared
distance of candidate tangent points from their disc centers; its reported bound is
`abs(length²−radius²)/radius`. It verifies disc membership error, **not** all tangent
orientation/union topology. f32 narrowing error compares exact binary values. No exact
reference for irrational tangent orientation or actual CanvasKit conic raster is claimed.

Current observed output:0 normalization mismatches,0 false containment omissions,9
conservative hulls,102 hull observations,126 omitted hulls, maximum radial residual bound
2.183×10^-12, maximum observed f32 component narrowing error0.000485692. Any normalization
mismatch or false containment sets nonzero exit; raw report preserves all543 rows and
source SHA256. A prior false containment was repaired by the current conservative rule;
the retained fixture prevents concealing it. Numerical results are observations, not
unit tests, E2E or proof of the required pan/zoom profile. Sources/results are unchanged by
this documentation update; no new experiment or runtime check was executed.

Recorded native toolchain: Rust1.99.0 (`b940084d7`,2026-09-28), Cargo1.99.0, Node24.12.0,
darwin arm64; source base8dbd9b1 plus identified experiment source hashes. Cargo build,
Clippy warnings denied, rustfmt, TypeScript strict check and Oxlint/Oxfmt are static/build
validation only. No Wasm compilation/run, generated binding execution, CanvasKit rendering,
physical pen, browser numerical E2E or runtime latency acceptance is present in this task.
Relevant IDs REG-PREC-01/03/04/06, WMP-01/04/08/09/11; future E2E owner rust_engine semantics
with web implementer driver and rendering_performance review. Historical probes remain
historical; none certify this slice. Owner approval and P05-E01 confirmation remain gates.
