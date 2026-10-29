# SAVE-02 — Rust save-batch and browser-storage safety checkpoint

Status: isolated checkpoint complete; independent review passed with findings resolved. Production saving remains disabled.
Owner approved transferred buffers as the initial baseline on2026-10-29 and authorized this
checkpoint, with results returned before production implementation. Branch
codex/save02-rust-storage-checkpoint stacks on frozen SAVE-01 commit3858822 (PR22), not main.
No preview, donor, application asset or production storage adapter is changed.

## Scope and responsibilities

Rust owns completed-state projection, exact regional coordinates, immutable source retention,
metadata and bounded encoding. The browser owns disposable transfer buffers, worker lifecycle
and storage execution. Payload release is separate from durable commit confirmation as defined
in [the shared interface](../docs/interfaces/shared-saving.md). Native Arc-based sharing remains
unimplemented; the existing engine's same-thread Rc references are not claimed thread-safe.

The default-off save-checkpoint feature exposes five experimental functions. One retained
snapshot freezes completed metadata and deduplicates source references. Encoding emits at most
65,520 bytes per call. A generation is a snapshot handle, not a document revision. No stable ABI,
file format, production save scheduler or full-document-per-edit saving is adopted here.

Admission caps:100k scanned stroke entries including tombstones,4096 layers,1MiB layer-name
bytes,1M distinct source samples and one retained snapshot. These bound this experiment only.
Paper/grid host state, incremental change tracking, durable revisions and load are out of scope.

## Acceptance and security

Traceability: CT-03/04/05/08 and INV-01/06/07 guide capture, concurrency and recovery.
SU-09–13/18 remain future production UI/native acceptance; these isolated boundary checks
do not count as full passes for those scenarios. Independent review closed the bounded-fault
waiter and valid-digest unknown-flags findings after source-matched reruns.

| ID | Trigger | Required result and evidence owner |
| --- | --- | --- |
| SAVE-BATCH-01 | Capture during drawing, movement or Slice | Completed projection only; Rust writer, browser/Wasm assertions |
| SAVE-BATCH-02 | Edit/undo/discard redo after capture | Original retained raw sources unchanged; Rust writer |
| SAVE-BATCH-03 | Extreme regional values, stale handles, capacity/end reads | Exact i64/f64/f32 encoding and bounded rejection; Rust writer |
| SAVE-STORAGE-01 | Commit completed but worker dies before reply | Reopen and reconcile committed fixture receipt; lead |
| SAVE-STORAGE-02 | Worker dies before commit; competing owner | Rollback and exclusive ownership; lead |
| SAVE-STORAGE-03 | Damaged metadata, unknown flags, missing target | Refuse before initialization, preserve file hashes/sizes; lead |
| SAVE-STORAGE-04 | Worker/request fails before fault notification | Bounded waiter settlement; lead |

Storage uses generated disposable OPFS namespaces only. Pinned SQLite3.54.1 SAH-pool metadata
is inspected read-only under a cooperative Web Lock before backend initialization. The guard
is fixture-limited (32 files/1MiB), not a general database validator. Unknown flags have a valid
metadata digest to independently test their rejection. The unsafe upstream negative control
operates on a separate copy, never the preserved canary or user files. Original proxy-VFS writer
retirement is not proven. Same-origin hostile writers, large-file admission, quota/power-loss,
content corruption, migrations and production grants remain outside this checkpoint.

No production headers, dependencies, input, rendering or save-status UI change. E2E browser
boundary experiments and static/build checks replace unit tests. No designer-visible change;
independent sensitive-boundary review is required. Generated evidence stays in ignored cache.

## Results

Final evidence: .build-cache/save02-batch-final/report.json and exports.json;
.build-cache/save02-storage-final/report.json. Reports bind exact source/Wasm hashes.
Apple M2Pro/16GiB, macOS Darwin27, installed Chrome156.0.8078.48 headless.

Rust:19 correctness assertions,2 capacity checks and15 measured runs passed. One million
samples: capture median below0.1ms browser resolution; total chunk encoding median16.1ms,
maximum16.3ms; maximum individual chunk encode0.2ms. These exclude validation/checksum work
and do not establish physical input latency or end-to-end durable-save timing.

The metadata-heavy100k-tiny-stroke capture took225.5ms for13,200,047 metadata bytes. Wasm
linear memory grew from1,054,670,848 to1,098,842,112 bytes; the large initial fixture allocation
is not capture overhead. These are linear-memory sizes, not process RSS. Full metadata scanning
is a production responsiveness blocker: implement incremental completed records/tombstones and
reuse already-saved immutable sources before production adoption.

Storage:10 assertions passed. Lost reply reconciled the committed fixture receipt; precommit
worker death rolled back. Healthy inspection and damage refusal preserved hashes and sizes,
including restart, unknown flags and missing drawing. Unsafe initialization on the separate
copy reduced the damaged mapped file from53,248 to4,096 bytes, reproducing upstream truncation.
The synthetic receipt table does not bind operation bodies, document incarnations or grants.
This result supports guarded refusal; it does not establish production backend safety.

Feature-off build retains the frozen baseline's118 exports and ABI fingerprint; feature-on
adds five exports. Rust builds, scoped formatting/lint, strict runner types and diff checks pass.

## Next gate

Keep transferred buffers as baseline. Before production: incremental capture and authoritative
revision/body-bound receipts; paper/grid capture; real document persistence/reload with visual
parity; full SQLite content/recovery and writer-retirement checks; quota and failure handling;
whole-app responsiveness under saving. Return these checkpoint findings to the owner first.
