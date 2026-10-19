# Regional arithmetic limits

The [regional experiment](../../scripts/probes/regional/run.ts) is a bounded one-axis diagnostic
against an exact dyadic oracle. Run `pnpm probe:regional`; its stdout is disposable evidence.
The [inverse experiment](../../scripts/probes/regional/inverse-run.ts) uses exact rational
comparisons for division. Neither is a drawing engine, supported-span policy or benchmark.

## Findings that remain relevant

- Relative integer subtraction preserves some near-extreme i64 displacements that absolute
  Number flattening loses. It is necessary, but not sufficient: a relative `2^52 + 0.25` term
  can lose its fraction before cancellation, yielding a two-point error at zoom 8.
- Two individually valid i64 regions can differ by `2^64 - 1`. Intermediate arithmetic needs
  a wider checked range than the stored address type.
- Normalizing local `-Number.MIN_VALUE` requires a previous-region residue
  `65536 - 2^-1074`, which binary64 cannot represent exactly. Rounding versus rejection,
  tie/carry rules and upper-domain endpoint behavior remain explicit contract decisions.
- An inverse at point 1, center 0, zoom 0.1 has nonzero exact error even when a Number
  round-trip appears exact. At `MIN_VALUE / 8`, the candidate underflows to zero while the
  exact inverse remains `2^-1077`. A floating-point round-trip is not an accuracy oracle.

The quarter-native-point comparison concerns derived visible geometry after zoom, **not**
permission to round original accepted input by that amount. Preserve original accepted samples;
keep storage canonicality, input rounding, transform approximation and renderer conversion
postconditions separate. Do not silently repair malformed persisted values.

Read [precision follow-up](../../docs/reviews/regional-precision-followup.md),
[forward scope](../../docs/reviews/regional-arithmetic-probe.md) and
[inverse scope](../../docs/reviews/inverse-mapping-probe.md) for REG-PREC-01–06 and
CT-02/03/04/06 obligations. Supported stroke span, complete transform path, painted bounds,
clipping/culling, hit/export parity, native/Wasm agreement and input-device acceptance remain
unproved. Diagnostic counterexamples are useful outcomes; they are not a green product gate.
No historical count or developer-tool test suite is reinstated by this documentation.

## S02-W01 memory-web candidate

The [WMP-C2 proposal](../../docs/interfaces/web-memory.md) and
[numerical definition](../../docs/interfaces/web-memory-numerics.md) document the solid round pen and the bounded exact-reference pan/zoom extension. The
original fixed-zoom1 observations remain a separate baseline; they do not certify variable
zoom. See the numerical definition for exact per-category counts, distinct inputs and limits.
No old global-f64 ABI, browser storage or product code is adopted here.

Run `node scripts/probes/web-memory/run.ts` from the repository root with the documented
Node/Rust tools. It builds the isolated [Rust candidate](../../experiments/web-memory/Cargo.toml)
into `.build-cache/web-memory/target` and compares fixed synthetic inputs with the
independent exact-reference calculation. Its ignored `report.json` includes input vectors,
candidate output, source hashes, tool/platform/base identity and mismatch/error observations.
Run `node scripts/probes/web-memory/viewport-run.ts` for the separately reported zoom/pan
normalization extension. Its exact rational oracle is independent of the fixed-storage Rust
candidate. Do not commit generated reports, binaries or captured previews. Reproduce against the exact
reviewed source; an old report cannot certify changed arithmetic.

Use `cargo fmt --check --manifest-path experiments/web-memory/Cargo.toml` and
`cargo clippy --manifest-path experiments/web-memory/Cargo.toml --target-dir
.build-cache/web-memory/target -- -D warnings` for static checks, plus `pnpm check`
for TypeScript/source checks. These are not newly introduced unit/developer-tool test suites.
The source experiment is authorized specifically by the confirmed S02-W01 investigation.

Evidence separates exact normalization/case classification from floating-point tangent/radius
construction and final renderer behavior. Effective binary64 inputs must survive serialization;
small decimal offsets rounded away before the candidate are not boundary evidence. Retain the
near-containment counterexample and conservative branch rationale in the current numerical
definition. A circle/tangent residual or f32 narrowing result is not a raster proof.

Future P05-E01/E02 must exercise the actual approved Rust/Wasm/CanvasKit path through browser
E2E, including WMP-01–12, declared surface limits, cold/warm/evicted geometry, active cancellation,
en/uk/focus/navigation and privacy/failure cases. Physical pressure, native hosts, full transform
envelopes, GPU/RSS and latency remain outside this diagnostic. Never relabel an injected call
or a synthetic numerical observation as an actual pointer/device or native acceptance result.
