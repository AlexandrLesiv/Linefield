# Product experiments

These are isolated source experiments for unresolved primary-app behavior. They are not
production drawing/storage code and do not run as part of the app.

- browser-storage: synthetic browser-local SQLite ownership, crash and corruption experiments.
  fault.js deliberately injects worker/transaction failures. Results have exposed data-loss risk;
  no storage mechanism is adopted by retaining or running the experiment. Dependencies and output
  are local under .build-cache/browser-storage. Run acquisition before the browser experiments.
- regional: arithmetic and mapping experiments for the prospective drawing engine. These diagnostics
  do not choose production numerical limits or algorithms.
- web-memory: confirmed S02-W01 synthetic exact-reference comparisons against the isolated Rust
  candidate in experiments/web-memory. Run `node scripts/probes/web-memory/run.ts`; results and
  build products stay in .build-cache/web-memory. This is contract evidence, not a test suite,
  browser E2E, production engine or owner adoption of the numerical proposal.

Keep reproducible experiment source while its product decision remains unresolved. Put run
reports/captures in ignored .build-cache and attach relevant results to the task PR. Remove the
experiment when a reviewed production contract and implementation replace it; do not keep copies
of old runs or downloaded libraries in Git.
