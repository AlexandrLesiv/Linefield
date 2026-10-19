# Product experiments

These are isolated source experiments for unresolved primary-app behavior. They are not
production drawing/storage code and do not run as part of the app.

- browser-storage: synthetic browser-local SQLite ownership, crash and corruption experiments.
  fault.js deliberately injects worker/transaction failures. Results have exposed data-loss risk;
  no storage mechanism is adopted by retaining or running the experiment. Dependencies and output
  are local under .build-cache/browser-storage. Run acquisition before the browser experiments.
- library-schema: SQL constraint checks against the proposed primary-app document format.
- regional: arithmetic and mapping experiments for the prospective drawing engine. These tests
  do not choose production numerical limits or algorithms.

Keep reproducible experiment source while its product decision remains unresolved. Put run
reports/captures in ignored .build-cache and attach relevant results to the task PR. Remove the
experiment when a reviewed production contract and implementation replace it; do not keep copies
of old runs or downloaded libraries in Git.
