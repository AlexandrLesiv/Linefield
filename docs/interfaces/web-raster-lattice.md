# M04 accepted-pan raster proof

The lead adopts this bounded feasibility stage under decision243 after Rust and independent
review on2026-10-23. It authorizes compiled arithmetic/state/layout evidence only. Production
placement, shaders, live/tail/display transforms and pan-copy remain unchanged until the later
pixel and ownership checkpoint succeeds. Current same-view prefix reuse is independent.

## First compiled boundary

Use the existing checked22-word dyadic magnitude to prove whether
`savedIntegerOffset + (acceptedCurrentCSS − acceptedStartCSS) × backing` is exactly integral.
Decode finite input bits and multiply the53-bit backing mantissa without rounding the difference
first. Only a zero exact remainder permits an integer result. Overflow, unsupported range or
uncertainty is a categorized optional miss, never an accepted fractional pan or failed user pan.
Keep signed offset components within±16384. No dynamic bigint, epsilon, f32 comparison, rounded
canonical coordinates or additional per-event allocation.

Run this through fixture-only generated Wasm entry points and actual browser cases, with normal
shared pan commands providing accepted state. No separate unit or developer-tool test suite.
The first stage may compile an isolated candidate metadata type for measured layout; it must
not change production receipt storage or claim that a model is an integrated render contract.
Record actual native and Wasm layout, exact-input categories and eligible hit/miss counts.
Preserve fractional false-positive and useful-hit denominators, including5% and rotated views.

## Requirements for a later raster integration

Canonical FrameReceipt.view stays canonical. A proposed separate fixed RasterCapture holds a
captured anchor view, checked epoch, integer offset and eligibility. It is not another receipt
or mutable editor owner. Actual integrated Option<FrameReceipt>≤256, Option<TailDisplay>≤512,
combined registry≤3072 bytes, eight receipts, two fences and192MiB remain mandatory.

At pan Begin retain one pregesture raster state. Integral updates use original accepted start
and current values; fractional updates use canonical rendering while retaining the pregesture
anchor privately. Range or residual failure disables reuse until End. Integral eligible End
preserves the epoch; fractional or failed End reanchors at the canonical view with offset zero.
Cancel restores canonical and raster prestate. Basis, metrics, context or session replacement
invalidate lineage. Counter exhaustion disables optional reuse without wrapping.

Residual certification must enclose the canonical-versus-anchor evaluation using outward
binary64 operations and regional arithmetic. Require L1 residual≤1/4096 device pixel and debit
it inside the existing0.07px vertex/arithmetic allowance. All other geometry and AA allocations
remain unchanged. The first arithmetic/layout stage does not claim this residual proof.

A target captures one immutable raster phase. If a later page cannot certify anchored placement,
abandon the entire unacknowledged candidate, drain all issued readers and retire its ownership,
then reconstruct canonically. Never mix per-page canonical fallback into copied anchored pixels,
publish a partial overlap, add a receipt/fence, or delay an otherwise admissible next stroke.

Copied overlap and reconstructed strips must use identical anchored endpoint/fragment operation
order and exact integer offsets. Visibility remains canonical with outward residual expansion.
The pixel comparator must include the source B's actual geometry bytes, detail/coverage and
placement uniforms; matching logical source IDs cannot substitute for matching raster provenance.
Finer retained pages and clipped preparation are not assumed byte-identical to a fresh reference.
Changed phase or unproved provenance selects complete reconstruction.

## Stop and evidence gates

MIG-TILE-02/05/06; CT-02/03/04/06/08; INV-01/02/04/08/11; SU-03/04/13/14/16.
The single M04 writer owns the compiled fixture and static/generated/build checks. Fresh review
audits exact arithmetic, measured layouts and classification. Headless browser execution is
serialized with other GPU work. Cases include integer/fractional and1±2^-30 device displacement,
DPR1/2/noninteger,5%/100%,0°/15°/90°/180°, far regional carry/borrow, range boundaries, End/Cancel
and basis invalidation. Preserve every failed row and original output outside Git.

Stop on a fractional false hit, layout overrun or useful eligible-hit collapse. Do not implement
broad render-phase conversion merely to obtain this first proof. If it is required, continue the
already-adopted [G-only sparse stage](web-sparse-coverage.md) and retain lattice as a gated later
stage. Even a passing first stage is not GPU parity, panning benefit or full M04 acceptance.
