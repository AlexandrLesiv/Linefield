# WMP-C2 numerical candidate and evidence

Part of [WMP-C2](web-memory.md). Owner G1/P1 includes pan/zoom and approves its controls; G2 approves screen/surface
limits, G3 precision/normalization policy and G4 swept-disk geometry. Concrete zoom-aware
mapping algorithm and projection policy below received owner N1 approval at51d9345
on2026-10-19; actual product implementation still awaits its separately confirmed task. This source separates the completed bounded
pan/zoom investigation from earlier fixed-view observations. Generated observations stay in ignored `.build-cache`.
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
cancel restores captured viewport, never document history. Approved center-anchored zoom leaves center unchanged and steps zoom by×/÷1.25, selecting
0.1 or8 when crossing the respective endpoint. Arbitrary-anchor zoom is excluded from this
slice and capacity derivation. Inverse input division is still non-dyadic.
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

The earlier addition-only candidate `exact.rs` uses a **fixed19×u64 magnitude** at quantum2^-1074 plus sign. It
constructs exact region×65536 and two supplied floats, all bounded before decoding.
Maximum intermediate<2^80 occupies<1155 bits; capacity1216 bits. Checked wider quotient
uses i128 and converts only after mathematical-domain validation. Remainder extraction
and nearest-even rounding use integer bit/half/sticky inspection, including subnormals.
No heap big integer, rounding-mode dependency or global f64 coordinate. This addition-only
diagnostic is supplemented by the single-divisor candidate below. Both now construct final
IEEE bits directly after independent review exposed a small-normal underflow defect in
the earlier powi construction. Neither is production code or release-Wasm latency evidence.

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

## N1 — completed bounded pan/zoom investigation; owner-approved mechanism

Recommend exact single-divisor normalization for input and captured-base pan using a
fixed20×u64 (1280-bit) sign/magnitude workspace. The isolated candidate is
`viewport.rs`/`magnitude.rs`; its reference uses Node BigInt rational arithmetic and binary
search over ordered positive binary64 bit patterns. The candidate generates quotient bits
using integer division/remainder doubling, independently of that reference. Mathematical
domain validation precedes local rounding and checked carry. Neither implementation is an
application engine; the owner approved its adoption as N1, with runtime acceptance still required.

For example, center(region0,local0.1), canvas−8191.5, extent1 and zoom0.125 yield
region−1/local0.1 after exact normalization. Ordinary `local+(canvas−extent/2)/zoom`
produces local0.09999999999854481. This is a tiny visible error but a different canonical
coordinate; tolerance/round-trip checks would hide the contract violation. There were255
ordinary-operation disagreements, not255 visible drawing defects.

Capacity derivation: express local and positions in units2^-1074. Local integer L<2^1090;
accepted difference |D|<=2^1088 (pan16,384; input8,192). For zoom in[0.1,8], zoom=m×2^e,
m<2^53 and−56<=e<=−49. Numerator `L*m + D*2^(-e)` has magnitude<2^1145; denominator
`m*2^1074`<2^1127; regional denominator adds16bits and stays<2^1143. During rounding,
doubled remainders stay<2^1128; exponent alignment shifts only the smaller magnitude to
the larger's bit width. Relative quotient is below four regions in magnitude; add in i128
before checked i64 conversion. No absolute region is flattened to f64.

Culling across opposite i64 extremes requires wider intermediates. Region subtraction fits
u64 magnitude after i128 subtraction. Including local differences and radius expansion,
world-relative magnitude is<2^81, or<2^1155 quantum units. Multiplication by zoom's
mantissa stays<2^1208, leaving72bits of checked headroom in20words. Painted bounds may
extend beyond the stored canonical domain: widened comparison preserves them, including
radius expansion below regionMIN/local0. It must not reject valid artwork just because a
painted bound cannot itself be stored as an i64 regional coordinate.

The diagnostic checks capacities with assertions; production requires structured failure.
Fixed workspace and finite loops are not release-Wasm/main-thread timing evidence. The
scalar helper accepts −0 as normalization input and emits+0; production viewport centers
come from canonical Rust state. Its wider individual operand bound16,384 accommodates
both input and pan diagnostics, not a new public-input envelope. Real commands first enforce
approved exact canvas offsets/metrics. This is not a complete ABI validator.

## Regional culling and finite projection envelope

Conservatively classify whole-stroke painted bounds before relative f64 conversion.
`culling.rs` exactly compares one-axis regional intervals against the view plus a symbolic fringe;
it never projects opposite-extreme strokes before rejection. Touching stays eligible,
AABB false positives are allowed. The probe uses maximum radius256, not a claim that a
rectangle equals a swept hull. It accepts canonical endpoint bounds with the derived span;
it does not implement incremental bounds over arbitrary input histories.

An admitted stroke's per-axis center span is<=163,840+2^-37 after two normalization errors.
Store the next outward binary64 bound163,840+2^-35. Let L be that span, R<=256+2^-38
include derived-radius error, zoom z<=8, logical extent E<=8192 and support fringe F.
If the painted AABB intersects the view expanded by F, every center/control coordinate lies
inside `[-L*z-2*R*z-F, E+L*z+2*R*z+F]`, with outward arithmetic allowance. Thus magnitude
is<1,323,009+F. Even conditional F<=4096 gives<1,327,105<2^21. Synthetic F=0,2,4096 cases
reach1,327,104 for exploratory F4096; proposed F2 cases reach1,323,010. The renderer recommendation's2-logical-pixel guard still needs actual pinned
CanvasKit AA/clip verification; these experiments neither certify it nor select4096 instead.
Uncertain boundary classification remains eligible; unbounded conversion is never a fallback.

Under that envelope, f32 nearest rounding contributes<=2^-4 per component, Euclidean
<=0.088389 logical points. At projected radius2048, conic-weight perturbation adds<0.0000864.
These terms leave room within0.25 but are not a total tangent/fill/clipping/raster proof.
Observed culling-projection error was3.624×10^-13 and narrowing0.0003906251; separate
zoomed hull observations reach narrowing0.060939 and radial residual bound2.088×10^-10.
These are observations, not enforced error gates or global maxima. The geometry still
requires visible release-browser validation with the actual renderer.

## Retained failure and exact observation counts

Independent review found that `significand * 2_f64.powi(scale)` could underflow inside
power computation even when the final result should be positive normal. Identity
normalization of2^-1021 (4.450147717014403e-308) and2^-1000 returned0 in both candidates.
The earlier543 observations missed it. Both candidates now construct rounded IEEE bits
directly, including significand carry. Adjacent-bit fixtures and an exponent sweep retain
these cases. This was a repaired diagnostic defect, not a product bug.

`node scripts/probes/web-memory/viewport-run.ts` has13,302 observations and13,101 distinct
serialized inputs. Repeated endpoint/label observations are intentional; this is not an
exhaustive floating-point space or a claim about distinct mathematical situations.

| Category | Observations | Construction |
| --- | ---: | --- |
| Regional inverse | 1960 | 7 bases×5 locals×8 zooms×7 offsets |
| Canvas inverse | 160 | 4 extents×5 positions×8 zooms |
| Captured-base pan arithmetic | 224 | 7 bases×8 zooms×4 start/current pairs |
| Carry/tie boundaries | 84 | 7 bases×3 zooms×4 signed small displacements |
| Invalid zoom / exact screen bounds / invalid local / signed zero | 17 | 6 /4 /4 /3 explicit vectors |
| Selected exponent bands | 297 | 11 exponents×3 adjacent bit patterns×3 zooms×3 operand roles |
| Exponent sweep | 9810 | All power exponents−1074…15×3 adjacent bit patterns×3 roles, zoom1 |
| Center zoom steps | 63 | Endpoint/threshold neighbors, repeated steps, invalid direction |
| Regional painted AABB | 666 | Legal-domain combinations of3 bases,2 locals,3 zooms,2 extents,3 fringes,8 intervals; out-of-domain endpoint combinations excluded |
| Distant / touching AABB | 21 | 18 extreme-base comparisons and3 exact-touch adjacent values |

Observed0 candidate/reference mismatches,120 expected coordinate-overflow rejections,
51 input-bound rejections,380 eligible intervals and307 culled intervals. All687 culling
classifications match the exact reference. Input rejections include out-of-envelope sweep
roles and zoom-step endpoint neighbors, not just NaN/infinity. Projection assertions check
finite coordinates and the2^21 envelope; error maxima are retained for review.

The earlier command `node scripts/probes/web-memory/run.ts` now has594 observations and458
distinct serialized inputs: its previous543,33 normalization exponent-boundary additions,
and18 zoomed extreme hull additions. The original543 were280 regional normalizations,
35 fixed-view mappings and228 paint observations (216 ordinary,8 origin boundaries,
1 projected extreme,3 subnormal diagonals). Current totals:348 normalization observations,
246 paint observations;0 normalization mismatches,0 missed exact containment cases,
9 conservative hulls,120 hulls and126 omissions. The exact squared-distance oracle checks
containment and radial residual, not complete tangent orientation, winding or conic raster.

## Execution, ownership and limits

Runners send only bounded synthetic stdin to an isolated dependency-free Cargo binary;
no file/network/user drawing input or app imports. The viewport runner allows at most16,384
rows, submits at most4096 per process and enforces120s/1MiB output per process. Rows are
limited to512bytes. Results, exact rows, timestamps, tool versions and dependency SHA256
stay in ignored `.build-cache/web-memory/report.json` and `viewport-report.json`; Cargo
outputs are ignored too. This is retained source experimentation, not a new test suite.

Fresh runs use Rust1.99.0, Node24.12.0, darwin arm64, base797ffb1 plus report source hashes.
Rustfmt, Clippy with warnings denied, strict TypeScript and Oxlint/Oxfmt provide static/build
validation. No production Wasm, generated bindings, CanvasKit rendering, physical pen,
browser numerical E2E or latency acceptance is claimed. Arbitrary-anchor zoom and selection
transforms are excluded from the arithmetic capacity derivation.

Scalar captured-base rows establish arithmetic only. Repeated/cancelled/stale pan, final
pointer position, presentation receipts, region-edge transaction rejection, navigation,
Undo and scheduling still require real-app WMP-02/04/05/08/09/11 E2E. A stroke exceeding
65,536 samples does not increase this spatial span because its mapping stays fixed; the
experiment does not allocate such a stroke or claim history/resource behavior was exercised.

N1's exact arithmetic and outward regional projection policy are owner approved at51d9345,
alongside A1 and R1 in WMP-C2. No new product coordinate questionnaire or storage prerequisite
is introduced. After separate implementation-task confirmation, rust_engine and the web implementer own observable conformance; rendering_performance
owns the renderer/AA review, with fresh independent review of implementation and evidence.
Traceability: CT-02/06; INV-03/04/08; REG-PREC-01/03/04/06 and the WMP scenarios above.
