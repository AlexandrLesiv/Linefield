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
