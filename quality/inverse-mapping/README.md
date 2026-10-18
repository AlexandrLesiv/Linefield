# Inverse-mapping diagnostic evidence — 2026-10-18

Contract: docs/reviews/inverse-mapping-probe.md. S02 / REG-INVERSE-01–03, motivated by REG-PREC-06, CT-02/03/06 and INV-02/08. This is a disposable one-axis arithmetic experiment, not a production mapping implementation or native acceptance.

Run `node scripts/probes/regional/inverse-run.ts` for bounded stdout JSON. results.json records five exact source hashes, Node/platform and all21 observations.20 candidates are finite,7 have nonzero exact inverse error, and one nonphysical MAX_VALUE/0.1 stress case overflows. All20 finite projected errors lie within the diagnostic quarter-point comparison; this small fixture result does not select an input rounding budget, numerical algorithm or supported span.

At point1/center0/zoom0.1, ordinary inverse10 has exact world error2/3602879701896397 and projected error2^-54 despite a zero Number round-trip error. At MIN_VALUE/8, candidate0 underflows while the exact inverse remains2^-1077. Both errors remain exact rational values in the report. Positive/negative zero have rational equality; the candidate sign is recorded separately.

check.log records79 passing tests (10theme28localization27action14probe) plus all root/web type, lint, format, resource drift and source-size gates. Four new tests cover hand-derived fractions, boundary comparisons, invalid operands, deterministic matrix and under/overflow. No source of the original regional probe or application changed. No server, browser, native application, dependency, desktop automation or escalation was involved.

rust_engine supplied the independent hand calculation and scoped experiment guidance. Independent implementation/evidence review is recorded in review.json. The oracle is bounded by fixed finite fixtures and a fixed expression; it is not an untrusted arbitrary rational arithmetic service. No benchmark, full geometry, normalized regional position or Rust/Wasm parity is claimed.
