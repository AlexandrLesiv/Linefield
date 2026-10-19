# WMP-C1 numerical candidate and evidence

Part of [WMP-C1](web-memory.md), proposed, not approved. This source defines the current
candidate and reproducible experiment; generated observations stay in ignored `.build-cache`.
Owner-confirmed S02-W01 permits this bounded synthetic investigation only. It is not an
E2E suite, Rust editor, production arithmetic adoption, renderer or benchmark.

## Fixed mapping envelope

For each axis require exact logical canvas offset `canvas − extent/2` in[-8192,8192].
Extent[1,8192]; division by2 is exact in this normal range. Check this bound on the exact
dyadic difference before rounding. Captured off-canvas points are admitted within the
envelope; outside cancels current stroke atomically, never clamps. This bounds original
stroke per-axis span at16,384, derived from the envelope rather than a guessed global
document limit. With fixed world center0, zoom1, original scale1, no accumulated mapping
or transform arithmetic exists. This limited profile does not change future selected
zoom0.1–8/scale1/64–64 or regional address range. It does not define a finite page.

Canonical samples remain regional i64+local f64[0,65536), +0. First sample is immutable
source/placement anchor. Original−source is evaluated with checked relative region
subtraction, never absolute Number flattening. For this profile placement==source,
scale1: renderer evaluates original relative to fixed viewport directly, avoiding an
unnecessary subtract/add anchor round trip. Regions are at most−1 or0 in admitted ink;
the generic normalization candidate separately checks all i64 region boundaries.

Require V4-B: exact mathematical domain check, floor region/residue, nearest-even local
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
not selected production code. Production may optimize only with equivalent exact semantics
and browser E2E boundary evidence, without importing this diagnostic binary into the app.

## Painted geometry definition

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
Only strict disjointness permits culling; touching/uncertain bounds draw. Until that fringe
is established, draw the bounded scene and let the surface clip; never substitute endpoint
or centerline culling. Cache identity uses geometry/mapping tokens, never locale/theme.

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

Envelope: world offset<=8192, canvas half<=4096, radius<=256 gives final coordinate
magnitude<=12544. Nearest-f32 coordinate error<=2^-11 per component, Euclidean<=0.000691.
Circle weight error<=2^-25 and positive rational denominator>0.8535; sensitivity bound
`1.415*r*weight_error` adds<0.0000108. Combined conic control/weight perturbation<0.000702
logical points, before tangent construction and renderer rasterization. At DPR4 the
same position error is<0.002808 backing pixels. These analytical bounds explain the
conservative8192 envelope. They are not a complete Skia pixel error claim. Near-tangent
sqrt conditioning, f64 radius construction, clipping/AA and workload require actual
release CanvasKit E2E as WMP-08/09. Production acceptance cannot cite only these bounds.

## Experiment and limitations

Run `node scripts/probes/web-memory/run.ts` from repository root. It spawns only the
isolated Cargo candidate with bounded synthetic stdin and120s timeout; output<=1MiB.
No file/network/user drawing input, no app import and no new dependency. Sources use
native Node TypeScript and dependency-free Rust. Cargo target/report are ignored under
`.build-cache/web-memory`; source Cargo.lock contains only the diagnostic package.

Current corpus543 observations:315 normalization/mapping and228 painted segment cases.
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
unit tests, E2E or universal proof of the proposed numerical profile.

Recorded native toolchain: Rust1.99.0 (`b940084d7`,2026-09-28), Cargo1.99.0, Node24.12.0,
darwin arm64; source base8dbd9b1 plus identified experiment source hashes. Cargo build,
Clippy warnings denied, rustfmt, TypeScript strict check and Oxlint/Oxfmt are static/build
validation only. No Wasm compilation/run, generated binding execution, CanvasKit rendering,
physical pen, browser numerical E2E or runtime latency acceptance is present in this task.
Relevant IDs REG-PREC-01/03/04/06, WMP-01/04/08/09; future E2E owner rust_engine semantics
with web implementer driver and rendering_performance review. Historical probes remain
historical; none certify this slice. Owner approval and P05-E01 confirmation remain gates.
