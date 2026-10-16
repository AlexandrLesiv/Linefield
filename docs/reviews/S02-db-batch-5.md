# S02 decision batch 5 — local SQLite durability and maintenance

Status: DB17-B, DB18-A and DB19-A selected on 2026-10-16 (177, 175–176). Options below are historical alternatives; fullfsync ON is not the current policy. DB15-A/DB16-C already recorded. No implementation or schema publication. Independent of the command-receipt and cloud-retention answers. Preserve WAL selection (28), durable Saved acknowledgement (27), one-second maximum deliberate batching, bounded continued editing during storage failure and latest pre-upgrade-copy retention (40).

## DB17 — macOS durable synchronization baseline

A (recommended): WAL with synchronous=FULL and fullfsync=ON for the initial macOS persistent stores, subject to effective-setting/VFS verification and measured latency. fullfsync covers checkpoint synchronization as well; checkpoint_fullfsync adds no extra protection when fullfsync is already ON. Keep all disk work off input callbacks. No promise against hardware failure or universal platform equivalence.
B: WAL with synchronous=FULL and the normal VFS synchronization method (fullfsync=OFF). Still synchronized commits, but does not request the macOS F_FULLFSYNC method. Actual latency/durability implications need testing; do not label it equally protective without evidence.
A selects a configuration baseline, not unmeasured timing guarantees. Unsupported effective settings must surface for review, never silently downgrade. Other platforms review their own storage adapters.

DB17 clarification: F_FULLFSYNC is a macOS-specific method, not a universal/native-Wasm API requirement. Shared Saved semantics require verified completion by the selected platform storage adapter. Other native hosts use reviewed OS/VFS synchronization; browser SQLite uses reviewed browser-backed VFS/storage and cannot claim identical physical power-loss guarantees. The web VFS and WAL feasibility remain unselected/unproven; DB17-B selects normal macOS VFS synchronization with fullfsync=OFF and checkpoint_fullfsync=OFF; other platforms still require separate verification. Sources: https://www.sqlite.org/pragma.html#pragma_fullfsync and https://sqlite.org/wasm/doc/trunk/persistence.md (checked 2026-10-16).

## DB18 — WAL growth caused by long-lived read operations

A (recommended): first yield/restart eligible disposable background readers, then retry bounded checkpoint work, prioritizing editing. A restarted task must retain its required source identity; do not recapture a newer document for an existing exact-source export. Never discard a completed snapshot, durable job, accepted edit or protected recovery material. Readers that cannot safely restart are protected; if growth still approaches the reviewed ceiling, pause new write admission and follow existing bounded pending-work limits.
B: let existing readers finish and pause new editing admission earlier to prevent further growth. Simpler reader lifecycle and less repeated background work, but more user-visible editing interruptions.
Neither permits deleting the live WAL, limitless disk growth, forced foreign-connection interruption, or holding disk waits on the input path. Thresholds/accounting and starvation/fairness tests belong in the concrete packet.

## DB19 — Reclaiming free pages inside drawing databases

A (recommended initially): auto_vacuum=NONE; reuse freed pages and compact only as controlled maintenance when the drawing is not actively owned and storage/authority/validation conditions are met. Simpler ordinary write path, but the file may remain large after deleting artwork until maintenance runs.
B: auto_vacuum=INCREMENTAL from database creation, with bounded off-input maintenance calls. Allows incremental removal of eligible free pages but introduces pointer-map storage and more scheduling/migration cases.
No full compaction after each stroke. Maintenance must not change semantic document identity/revisions, invalidate current clients silently, race export/upgrade/deletion or promise secure erasure. Exact thresholds, temporary-space reservation, crash behavior and effective configuration remain review items.

## Evidence and next packet

The engineering packet will propose concrete queue/cache/WAL/storage/receipt/retry caps with rationale and test fixtures. Do not ask the owner to invent arbitrary megabyte limits or claim unmeasured values are proven. Consolidate settled choices and clearly mark superseded single-client drafts before contract approval. No tests executed for these proposals.

SQLite references checked 2026-10-16:
- https://www.sqlite.org/pragma.html#pragma_fullfsync
- https://www.sqlite.org/pragma.html#pragma_checkpoint_fullfsync
- https://www.sqlite.org/pragma.html#pragma_auto_vacuum
- https://www.sqlite.org/wal.html (checkpoint starvation)
