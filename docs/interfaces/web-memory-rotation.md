# Buttons-only rotation contract

Owner approved the numerical/ABI profile and immediate preview on2026-10-19 for P05-E02.
Owner selected −15° / reset0° / +15° buttons only. No rotation drag gesture. Existing
world coordinate range, zoom0.1…8 and0.25-logical-point geometry tolerance remain unchanged.

## Bounded experiment plan

`node scripts/probes/web-memory/rotation-run.ts` compares an isolated fixed-storage Rust
candidate with an independent Node BigInt rational oracle. Rust rounds by streamed quotient
bits; the oracle binary-searches binary64 values. No application imports or new dependencies.
Results go to ignored `.build-cache/web-memory/rotation-report.json`. This is an authorized
numerical risk experiment, not an E2E suite or performance acceptance.

Before running, the declared corpus is7,680 mathematical input rows, each evaluated both
with coefficient transpose and exact determinant-corrected inverse:15,360 observations.

| Family | Rows per algorithm | Construction |
| --- | ---: | --- |
| Regional | 5,832 | 24 orientations ×3 regions(MIN,0,MAX) ×3 locals(0,0.1,nextDown65536) ×3 zooms(0.1,1,8) ×9 combinations of x/y offsets−8192,0,8192 |
| Small and cancellation | 1,152 | 24×4 values(minsubnormal,2^-1021,2^-1000,nextUp1) ×3 zooms ×4 exact-difference roles |
| Pan difference | 576 | 24×3 zooms ×4 start/current pairs ×2 bound profiles(8192input,16384pan) |
| Boundary | 120 | 24×5 exact-screen-limit and diagonal cancellation neighbours |

Each row checks one output axis; the24 orientations include all signed/swapped coefficient
pairs for the other axis. Exact difference is retained before weighting: screen-minus-center
and captured-start-minus-current are not rounded to a temporary binary64 value. The small
normal examples retain the underflow defect discovered in the original N1 investigation.
The existing512-byte row,4096-row process,120-second/1MiB process limits remain.
The final extension declares1,320 painted-axis classifications:24 orientations×3 opposite
regional deltas per axis×3 zooms×2 extents=1,296, plus24 cardinal exact-touch/adjacent-bit
rows. Total candidate/reference observations16,680. A further1,296 projection-only rows
cover24 orientations×3 zooms×2 extents×9 conservative envelope corners/axes. This projection
calculation is JavaScript binary64 against exact rational arithmetic, not Rust geometry E2E.

## Approved arithmetic

Use24 fixed binary64 coefficient pairs with exact cardinals and quadrant symmetry, indexed
by integer step0…23. No runtime trigonometry or libm dependency. Non-cardinal coefficients
are dyadic approximations; their squared norm is not exactly1. The experiment measures both
transpose division and the true inverse of the represented matrix. The recommendation will
prefer exact inversion if its bounded workspace remains practical.

Coefficient integers C,S are exact after multiplying by2^54; determinant D=C²+S² is at most
109bits. Weighted exact differences use quantum2^-1128. With zoom=m×2^e,
m<2^53 and−56≤e≤−49, inverse normalization combines local L at quantum2^-1074 as
`(L*2^54*D*m + weightedDifference*2^(108-e))/(D*m*2^1128)`.
Input/pan weighted differences are below2^1144; numerator below2^1309; denominator below
2^1290; regional denominator below2^1306. Round/remainder alignment stays within this
bound.22×u64=1408bits leaves at least99bits headroom. No absolute i64 region flattens to
Number; region addition/domain rejection/carry follows N1 and canonical+0. The diagnostic
widens its shared magnitude workspace; production uses22words under this approval.

## Results and recommended numerical profile

The inverse run has15,360 observations/15,216 distinct serialized inputs, zero Rust/oracle
mismatches and2,256 expected rejections across both algorithms. The algorithms give different
canonical results in1,555 input rows. Recommend the **true determinant-corrected inverse**,
with22-word workspace: sixteen extra bytes per magnitude compared with N1. It is not a
heap big-integer library or a memory quota change.21words would fit the conservative bound;
22 leaves explicit implementation headroom. Production must return structured numerical
failure rather than diagnostic assertions. No timing acceptance follows from this experiment.
The final1,320 painted-axis observations also match their independent reference, bringing
the fixed-workspace run to16,680 observations/16,536 distinct serialized inputs and zero
mismatches. These include strict outside versus retained touching cases; they do not claim
complete stroke culling coverage. Source hashes, platform/tool identity and rows are in the
ignored report. Static TypeScript, Oxlint/Oxfmt and Rust fmt/Clippy/build validation are
required separately; no unit or developer-tool test suite is introduced.

The four nontrivial positive coefficient constants are0.25881904510252074,
0.7071067811865476,0.8660254037844386 and0.9659258262890683, plus exact0,0.5,1. The source
certifies their nearest-binary64 choice against independent256-bit rational intervals of
√2,√3,√6 and their sum/difference, entirely inside adjacent-binary64 rounding midpoints.
Quadrant symmetry supplies all24 pairs. Maximum exact |c²+s²−1| is1.368×10^-16 in the table.
Use fixed bit patterns in production and no runtime transcendental dependency.

Projection observations reached magnitude2,639,532.005, Euclidean binary64 error below
2.471×10^-10 and f32 narrowing error below0.098738 logical points. The conservative bound
is **2^22**, replacing the earlier unrotated2^21 conversion envelope, while preserving the
same coordinate domain and0.25 geometry tolerance. For magnitudes below2^22, f32 rounding
is at most0.125 per component, Euclidean0.176777; conic weight error at radius2048 adds
less than0.000087. Coefficient norm/radius error is below10^-12 at that radius. These leave
more than0.073 logical points for the other geometry terms; they do not prove arbitrary
hull conditioning, CanvasKit clipping/AA or visible E2E conformance.

True inverse maps the admitted screen square to per-axis extent less than231,705 world
units at minimum zoom, including normalization allowance; this replaces the earlier
163,840 derived stroke span, not the input envelope or a sample limit. Use the conservative
outward231,705 span. Project all hull normals/control offsets consistently with centers;
rotating only center coordinates is invalid. Disc diameter and pressure policy remain
unchanged. Coordinate narrowing still happens once in Rust after bounded projection.

For production culling, recommend comparing canonical whole-stroke world AABB expanded by
maximum radius/rounding allowance against the **inverse-view world AABB**. Its half-width
is `(abs(c)*(width/2+2)+abs(s)*(height/2+2))/(Dreal*zoom)` (and swapped for y), evaluated
with outward/exact comparison. Touching and uncertainty remain eligible. At admitted limits
this half-width is below57,987 world units; an eligible stroke's endpoint is within
231,705+57,987+257=289,949 world units of view center per axis. Thus regional delta≤5
remains valid:6 regions minus the largest possible local difference exceeds327,680.
Do not flatten far regions or reject paint merely because it extends outside stored domain.
For these comparisons, regional magnitude below2^81 at quantum2^-1074 multiplied by the
109-bit determinant and53-bit zoom mantissa is below2^1317, fitting22words. Controls plus
radius and projection remain below2^22. The observed painted-axis corpus instead directly
checks coefficient-weighted rotated AABB axes, including opposite i64 region extremes;
it verifies exact arithmetic/classification without certifying a complete production culler.

## Approved typed boundary and behavior

Add only `memoryRotateStep(owner:Id, session:Id, mapping:Id,
direction:"left"|"right"|"reset") -> Reply`, `Mapping.rotationStep:number` and
`Mapping.rotationDegrees:number`.
Rust validates direction before conversion; step is integer0…23, initially0, retained with
the viewport through Back/Resume and resize. Right advances one step clockwise in screen
right/down coordinates; left decrements modulo24. Reset0 returns `noop` at0 with no mapping
or presentation generation change. Rust owns angle formatting argument as signed integer
degrees in[-180,165] through `rotationDegrees`; host localizes the label without defining
rotation policy or deriving the signed convention.

Successful rotation preserves regional center and zoom; updates mapping/scene/presentation
identities atomically; invalidates exact mapping readiness; changes no artwork/history.
Reject during ink or active pan; reject stale owner/session/mapping unchanged. Reserve all
required generation increments before mutation. Buttons accept an idle exact mapping or compatible original preview source (no queued click/repeat); field/IME handling remains untouched. Old page/frame
receipts cannot acknowledge the new mapping. Center-anchored zoom stays center anchored.
Pan at a rotated view uses the same true inverse on captured screen deltas, retaining
captured angle. Pan-preview translation must rotate the world-center delta into screen
coordinates before zoom/backing scaling; otherwise ink moves diagonally out of alignment.

Immediate button feedback extends the approved pan preview to the full Rust-issued affine transform.
`memoryPanPreview` retains its named query and ordinary Reply identities. Its copied payload is
`sourceMapping:u64, active:bool, outside:bool, m11:f64, m12:f64, m21:f64, m22:f64,
offsetX:f64, offsetY:f64`. Source mapping is the unique immutable raster-origin identity within
owner/session; the former misleading sourceInteraction field is removed. Matrix order is
`[m11 m12 offsetX; m21 m22 offsetY]` in backing pixels. Rust computes source/current coefficient
matrix composition with the source determinant inverse; translation uses the current rotated
regional center difference plus the same fractional viewport center in backing pixels.
Same-angle composition is exact identity. No browser trigonometry, accumulated transform,
new mutable owner, geometry copy, or image queue is introduced.

The source is fenced by owner/session/content/metrics/zoom, remains the original published
composition across accepted repeated rotation, pan and reversals, and is retired only on exact
current publication or incompatible mutation/lifecycle. Active ink/pan blocks rotation. Rotation
before exact catchup is admitted from a valid source; ink remains exact-mapping gated. Zoom and
arrow steps retain exact-mapping admission. Transformed source-corner AABB nonoverlap requests
white while retaining the source for reversal. Exposed areas are white, later refined by accurate
geometry; all visible strokes share the same transform. Accepted ink not yet visible remains
canonical for accurate catchup. Publication rejects superseded mappings and switches atomically,
without animation, loader or coordinate jump. The existing maximum two simultaneous image
handles and no-readback rule remain. Temporary raster filtering can change antialiasing, never
canonical geometry. No performance acceptance limit is waived.

## Required implementation cases and ownership

Rust implementer owns CT-02/04/06, INV-03/04/08/11, WMP-04/08/11 and REG-PREC-01/03/04/06.
Actual-app browser E2E must draw at diagonal/cardinal orientations; verify+24steps/reset
return without cumulative drift; pan and zoom after rotation keep ink/cursor aligned;
Back/Resume/resize retain view; active ink/pan rejects rotation; stale pages/receipts and
rapid clicks never publish mismatched geometry; invalid direction rejects without mutation;
near regional limits and subnormal inputs normalize under the reviewed rule; history and
cancel remain unchanged. Isolated binding fixtures retain their boundary label, not native
input evidence. Designer reviews compact en/uk controls/angle states. Independent review
checks arithmetic/culling/security and actual exact-build E2E. The experiment remains separate from production browser E2E; current implementation evidence is recorded in the web quality guidance.
