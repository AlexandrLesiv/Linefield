# SAVE-03 disposable revision/receipt executor

Run `node scripts/probes/save-recovery/run.ts` from the repository root after the SAVE-02
pinned SQLite acquisition. LINEFIELD_PLAYWRIGHT_ROOT selects an installed Playwright package;
LINEFIELD_EVIDENCE_DIR selects ignored results. Uses isolated installed headless Chrome and
an ephemeral loopback origin; no live previews or user drawings are accessed.

The storage worker is the existing SAVE-02 fixture, with single-request exclusion and a
lazily loaded receipt executor. SQLite stores opaque framed batch streams, SHA-256 body digests,
base/result revision strings and operation identity in one transaction. Document/incarnation/
current grant checks occur inside that transaction. Retired grant names cannot be reused.
A reconciliation receipt carries current authority; it does not claim that authority originally
committed the batch. Production grant generation/retirement is not implemented.

A valid exact duplicate returns the original result without a second mutation. Changed bodies
or revision identities conflict. Missing receipts mean Unknown. Fault hooks pause before or
after COMMIT; the test controller kills the worker and reopens the database. Pending transaction
reads are rejected, so a paused uncommitted row cannot become a durable receipt. Trusted raw SQL
is retained only for fixture setup and fault injection; it is not an application interface.

Experimental bounds:128 saved batches,128 grants,48MiB aggregate payload. Rejections preserve
previous committed state. The adapter aggregates bounded chunks into one framed transferable
buffer and computes SHA-256 before submission; timing includes that cost separately. It is not
a production streaming blob writer and adds copies. The inherited read-only OPFS admission
check is limited to1MiB/32files, so large-database reopening is deliberately not claimed.

Reload validates canonical u64 revisions, operation identities, ordered chain, head revision,
body hash and framing before passing data to Rust. Rust must independently validate semantic
records and publish the staged document atomically. Hashes detect accidental mismatch, not a
malicious same-origin actor capable of replacing both payload and digest. No production schema,
SQLite corruption repair, power-loss durability, quota handling or native saving claim applies.

Behavioral sources exercise actual browser workers and SQLite. Generated reports contain source
hashes, artifact identity, hardware and browser. Read tasks/SAVE-03.md for acceptance and results.

Set LINEFIELD_CHECKPOINT_WASM to the isolated save-incremental Wasm artifact to also run
roundtrips.js. It exercises real Rust deltas through SQLite and a fresh Rust reload in three
modes: normal, lost postcommit reply, and precommit worker death with identical-body retry.
The last case does not infer rollback from a missing receipt; exact-body idempotent replay is
safe for either outcome. Every returned receipt field is checked before Rust acknowledgement.
The engine must compare embedded batch revisions with the persisted envelope as well.

Artifact command example (from repository root, after building the feature):

```
LINEFIELD_CHECKPOINT_WASM=.build-cache/save03-rust-target/wasm32-unknown-unknown/vector-editor/vector_core.wasm node scripts/probes/save-recovery/run.ts
```

The normal run measures framing, hashing and submit-through-receipt separately. Recovery-mode
submission times include worker restart/reconciliation and are not steady-state disk benchmarks.
Exact Rust projection and full geometry bytes are compared; this does not establish pixel parity
for paper/grids, shader/material output, or application load/navigation UX.
