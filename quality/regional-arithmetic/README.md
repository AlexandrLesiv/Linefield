# Regional arithmetic diagnostic evidence — 2026-10-18

Scope: S02 mathematical probe under decision235, applying selected regional/anchored policies without implementing an application engine or choosing a supported stroke span. Contract and limits: docs/reviews/regional-arithmetic-probe.md. Base fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus existing uncommitted work. Exact probe-source SHA256 values, Node version, macOS arm64 host and timestamp are recorded in results.json. No application files changed.

`node scripts/probes/regional/run.ts` evaluates nine explicit synthetic canonical one-axis fixtures ×three scales ×three zooms ×two diagnostic orders:162 observations. Full `pnpm check` passed24 shared-resource tests,23 action/configuration tests and10 new probe tests, plus root/web types, lint, format and source-size gates. check.log lists discovered IDs, zero failures/skips. A tagged noncanonical finite-overflow stress case and the normalization representability gap are tested separately.

| Diagnostic order | Observations within0.25 native-point arithmetic error | Observations outside | Largest observed absolute error |
| --- | ---: | ---: | ---: |
| Regional integer difference before Number narrowing | 66 | 15 | 33,554,176 |
| Deliberately lossy absolute Number flattening | 52 | 29 | 33,554,176 |

These are exact error comparisons against binary64 input values, not renderer accuracy scores or an admitted operating envelope. Counterexamples are intended diagnostic outcomes, not failed tests. The large-error fixtures deliberately span extreme coordinates. The oracle never converts absolute region addresses to Number and compares error against1/4 using exact BigInt dyadics. Approximate error fields are explanatory only.

Useful findings:

- Quarter-unit displacement near maximum i64 region: at scale1/zoom8 the relative diagnostic retains the exact2-point result; absolute flattening loses2points.
- With source0, sample at region2^36/local0.25, placement0 and view at region2^36/local0, exact output at scale1/zoom8 is2points. Both tested evaluation orders return0. Subtracting integer regions first alone does not guarantee precision after intermediate cancellation.
- Maximum minus minimum valid i64 address is2^64−1: intermediate relative arithmetic needs more than signed64bits even though both positions are individually valid.
- Deliberately noncanonical local−Number.MIN_VALUE mathematically borrows into previous region with local65536−2^-1074. Binary64 cannot represent that canonical local exactly. The probe records this unresolved normalization edge; it does not select rounding, snapping or rejection policy.

No Rust/Wasm/native/renderer execution, geometry/clipping/culling, painted-width/hit/export parity, admission, persistence, Undo or device E2E is established. No timing or performance claim. No supported stroke span selected. Exact ABI and numerical policy proposals still require their review. Independent code/math/security review passed. The reviewer checked all162 exact errors/classifications with a separate rational oracle, independently ran checks and verified all eight final source hashes. The math specialist independently confirmed cancellation and borrow cases. A review-found approximation-helper underflow limitation was corrected and covered by a regression; final10-test evidence includes the fix. No unresolved finding within this diagnostic scope.
