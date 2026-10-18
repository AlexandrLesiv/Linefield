# S02 regional arithmetic diagnostic v1 — 2026-10-18

Status: scoped mathematical evidence probe; no application implementation or supported stroke-span selection. Decision235 authorizes task/tooling work. Decisions184 and196–207 supply selected inputs/policies. Lead owns this packet and probe; rust_engine advises; fresh reviewer independently assesses code/evidence. Base fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved working tree.

## Frozen scope

Use native Node TypeScript under scripts/probes/regional/ only. No application imports, schema/ABI changes, rendering, storage or normalization implementation. Decode finite IEEE754 binary64 values into exact dyadic BigInt rationals. Exact arithmetic is the reference for synthetic regional differences and anchored point transforms. Compare two explicitly diagnostic evaluation orders: regional integer subtraction before Number narrowing, and deliberately lossy absolute Number flattening before subtraction. Neither candidate is selected as a production algorithm.

One axis is sufficient to isolate arithmetic; it does not establish two-dimensional painted-bound, hit-test or renderer correctness. Evaluate selected scale endpoints1/64 and64, scale1, zoom0.1/1/8. Use bounded explicit fixtures near origin, signed i64 extremes, positive/negative region boundaries and larger source-relative offsets. Report exact comparison to the0.25 native-point error criterion plus readable approximate errors, not a claimed geometric acceptance pass. Preserve synthetic input definitions and all outcomes. No real drawing content is read.

The oracle represents n*2^e, decoding bit fields with DataView and using BigInt for addition/multiplication/subtraction. Comparisons align exponents exactly; no Number conversion decides tolerance. Reject nonfinite input. Include subnormal decode, signed zero, known fractional identities and independently hand-derived arithmetic assertions to validate the oracle. Never convert absolute i64 region indices to Number in the exact reference.

Freeze diagnostic orders explicitly: relative delta(a,b)=Number(a.region-b.region)*65536+(a.local-b.local); absolute delta(a,b)=(Number(a.region)*65536+a.local)-(Number(b.region)*65536+b.local). Both then compute (delta(placement,view)+scale*delta(sample,source))*zoom, with each delta materialized first. Compare abs(candidate-exact)<=1/4 after zoom in native-point units. Nonfinite candidate output is a tagged diagnostic outcome, never JSON null or a successful tolerance comparison. Tests cover below/equal/above1/4, negative errors and finite operands whose diagnostic expression overflows. Ordinary matrix positions are canonical; the separately labeled MIN_VALUE borrow fixture is deliberately noncanonical input to a representability question, not accepted artwork.

## Scenarios and bounds

- REG-PROBE-001 / REG-01: finite decode, subnormal/negative-zero, NaN/Infinity rejection; explicit local=-Number.MIN_VALUE borrow shows that65536-2^-1074 is not representable as canonical f64. Record gap; do not choose repair/reject policy.
- REG-PROBE-002 / REG-01: exact subtraction of opposite i64 extremes needs65 signed bits; adjacent extreme-region differences preserve local fractions.
- REG-PROBE-003 / REG-04: anchored point-relative-to-viewport expression ((placement-view)+scale*(sample-source))*zoom, evaluated with exact binary64 input values and compared to diagnostic orders at selected scale/zoom endpoints. Include cancellation cases where large terms nearly cancel. No assertion that every candidate meets tolerance.
- REG-PROBE-004 / CT-08: deterministic bounded result rows with fixture/method/scale/zoom, exact error relation and approximate error; input/source hashes and host versions recorded separately. Assert an obvious lossy absolute-number counterexample is detected and ordinary local example agrees.

CT-02/03/06 and INV-02/08 are motivating contracts only; this probe does not discharge runtime invariants or SU acceptance. At most16 fixtures ×3 scales ×3 zooms ×2 methods (288rows); bounded BigInts from binary64 and i64 inputs only, no user-supplied workload. No timer/performance claims. stdout JSON, caller-owned evidence under quality/regional-arithmetic/. No production logging/correlation machinery is needed for deterministic synthetic test data.

## Limits and required next work

This isolates arithmetic error relative to exact values of supplied floats, not intended decimal inputs, physical input accuracy, geometry approximation, clipping/culling, transformed painted width, rasterization, hit tests, export or full supported-span evidence. Node/V8 results do not prove Rust, Wasm or Skia parity. Per-stroke span, normalization representability edge policy and reviewed ABI remain open. Native and browser application E2E are not run by this probe. Do not modify historical schema approval artifacts to record these results.
