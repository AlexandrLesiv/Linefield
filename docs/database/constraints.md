Current proposal: [S02 consolidated v2](../reviews/S02-consolidated-v2.md). This older draft is historical where v2 differs; its pending-choice notes must not reopen decisions through 180. No implementation approval is implied.

# S02 schema proposal v1: constraints and remaining freeze gates

These are documentation specifications, not executable migrations or tested DDL. schema source is visual documentation, not SQLite authority. Every table is proposed STRICT, with PRAGMA user_version as top-level version; application_id values must be assigned before migration code. Verify runtime supports STRICT and foreign_keys is enabled per connection; never use writable_schema to bypass unsupported formats.

## SQL constraints to express in migration DDL

- Required fields use NOT NULL. Exact singleton CHECK(singleton = 1); Rust additionally requires one row.
- UUID fields: CHECK(typeof(field) = 'blob' AND length(field) = 16). Nullable IDs: CHECK(field IS NULL OR (typeof(field) = 'blob' AND length(field) = 16)). UUIDv4/version and seeded-tool checks remain Rust validation.
- SHA256 fields: BLOB length 32. Native access/target/serialization bytes use reviewed max byte lengths, not UUID constraints.
- Counters/revisions/order/sample indices: CHECK(field >= 0); local integer relationship PKs additionally CHECK(field > 0). INTEGER range is signed 64-bit. Mutation preflights increments and rejects overflow.
- RGBA: CHECK(field BETWEEN 0.0 AND 1.0); pressure nullable with CHECK(pressure IS NULL OR pressure BETWEEN 0.0 AND 1.0).
- Width/zoom/uniform_scale positive and bounded by shared constants. Coordinates/translations bounded by shared finite constants. Do not implement until numeric constants approved. Rust rejects nonfinite and overflow before SQL and validates hostile reads independently.
- Document color_space CHECK(color_space = 'srgb'). Stable tool keys must be unique, nonempty and bounded; initial known tool UUID/name mapping checked in Rust.
- display_name bounded UTF-8 byte length, no embedded NUL; Unicode single-line/trim semantics in Rust. No UNIQUE name constraint, locale-dependent collation identity or source-name rewriting.
- samples PK(stroke_key,sample_index); FK to strokes ON DELETE CASCADE, ON UPDATE RESTRICT. Restrict stroke tool deletion. Sample contiguity and nonempty complete strokes validated by Rust inside whole-operation transaction, not per-row CHECK.
- All catalog preference FKs delete with their gallery item; tool deletion restricted. pen_preferences.tool_key must resolve to Pen (Rust validation, not an unreviewed trigger). No cross-database FK.
- rename_receipts: unique request_id, unique resulting_metadata_revision; CHECK(expected_metadata_revision >= 0 AND expected_metadata_revision < 9223372036854775807 AND resulting_metadata_revision = expected_metadata_revision + 1). Store name update, header revision and receipt in one transaction. Success response follows durable commit. Request ID reuse with different owner generation/expected revision/fingerprint rejects. Missing expired/old-generation receipt is unknown, never a replay license.

## Finite enum proposal

- catalog.sequence_recovery_state: known, unavailable.
- catalog.drawings.availability: available, missing, inaccessible, invalid, unsupported, conflict.
- lifecycle.operation_kind: create, import, delete, upgrade.
- lifecycle.phase: reserved, staged, validated, published, confirmed, removing, terminal, blocked. Rust transition table limits combinations; delete destructive phases require non-NULL confirmed_utc_us and exact target binding. Terminal deletion is a tombstone, not immediately garbage.
- snapshots.state: staged, ready, release_pending.
- export_jobs.format: native, png.
- export_jobs.state: preparing, queued, running, paused, cancel_requested, succeeded, failed, cancelled.
- export_jobs.publication_phase: not_started, staging, publishing, verified, uncertain.
- Claim owner required for running; snapshot/destination required for nonterminal actionable jobs. Terminal rows may retain references until safe release. Succeeded requires verified publication, but a later access revocation cannot retroactively erase a proven success.
- access_kind initially macos_security_scoped_bookmark for macOS proposal; other platform representations require reviewed additions, not arbitrary data accepted by string.

SQL enum checks constrain values, not complete transitions. Rust owns the state machine, revision comparisons, transaction ordering, admission/cancellation and safe cleanup. All terminal/error codes need the matching typed contract catalog before implementation.

## Recovery and security gates

1. DB1-A selects conservative three-database recovery: stage reconstruction, preserve uncertain files and block work requiring lost highwater/deletion authority. No fourth database or guessed permissions/counters. Detailed recovery transitions still require review.
2. DB3-A selects multiple bounded durable receipts. Before code, fix count/bytes, age/admission lifetime and generation rollover policy. Keep receipts/private hashes out of portable exports, imported authority and logs. If separate service ledger chosen, redesign atomicity explicitly.
3. DB2-A selects persistent activity_order plus library.activity_highwater, allocated with the catalog projection transaction across processes. Preserve real timestamps and UUID tie-breakers; reject signed-64-bit exhaustion without wrapping. Preserve which actions count as activity. Test retry deduplication, deletion of newest item, rollback/future clocks, stale completion and catalog loss. Exact durable handoff/recovery ordering remains a pre-code gate; worker completion is not edit time.
4. Jobs: exact resource caps, access-reference encoding, destination alias identity, process/owner claim fencing and publication verification remain contract freeze items. Timestamp/row alone never proves liveness, permissions or successful replacement.
5. SQLite recovery copies and exports are verified consistent standalone snapshots, not raw main-file copies while WAL is active. Bound snapshot readers/checkpoints/bytes; no long reader silently grows WAL forever.
6. Import admission validates expected schema shape, no unexpected triggers/views/extensions, sizes/counts/relations/UUIDs/finite values and supported versions using fixed SQL and reviewed SQLite defensive settings. Constraints in a hostile file are not trusted simply because their names match.
7. Metadata and content revisions form separately acknowledged durable state. Catalog refresh is repairable projection, not a second authoritative commit. Worker completions match session/operation/ownership generation plus expected revisions.

## Planned evidence (none executed)

Core/storage: original points unchanged under move/scale; sample gap/duplicate rejection; cascade parity; RGBA/pressure/type/UUID/range failures; incremental writes vs full-state reference; revision overflow; stale completion; simultaneous rename and argument-mismatch dedup; lost acknowledgement and retained/pruned receipt behavior.

Fault/recovery: kill at every create/import/delete/upgrade/export boundary; catalog corruption versus permission/busy/newer-version distinction; lost sequence authority; duplicate drawing identities; failed sync/disk-full; WAL reader growth; coherent standalone copy; source unchanged on failed import; uncertain publication pause; revoked destination grants; ownership lost with queued writes.

Performance: measure row-based size/open/save and receipt/index overhead; no performance conclusions yet. Native/Wasm roundtrip feasibility remains separate; native success cannot establish browser VFS guarantees.

Primary SQLite references checked 2026-10-16: https://www.sqlite.org/stricttables.html ; https://www.sqlite.org/foreignkeys.html ; https://www.sqlite.org/pragma.html . STRICT permits lossless type coercion and needs a compatible SQLite runtime. No schema source parser, migrations, native tests or store checks were run.
