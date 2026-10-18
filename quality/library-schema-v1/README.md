# Empty-library reference SQL checks

2026-10-19, base fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved work.
Node24.12.0, built-in SQLite3.50.4, in-memory databases only. These SQL resources are review
artifacts, not deployed migrations or a production persistence implementation.

`node --test --test-reporter=tap scripts/probes/library-schema/constraints.test.ts`
produced [six passing cases](results.tap), zero failures/skips. DLIB-SQL-01 verifies14 table
column sequences against the exact published DBML and STRICT flags. Other cases exercise
identity/name/scalar rejection, failed-receipt rename rollback, active-removal uniqueness,
Undo nullability, same-scope departure FK and distinct legacy-delete/departure authority.
This does not prove the entire schema, hostile-file validation, every constraint or browser I/O.

Root type checking, lint, formatting and aggregate checks (including web types and200-line
limits) passed. [Manifest](manifest.json) records exact hashes, SQLite version and comparison
with the prior118-case app browser evidence. This comparison is preservation, not a fresh run.
The reference DDL's browser-Wasm validation, crash boundaries, migration/recovery and all
production DLIB scenarios remain required after mechanism and implementation approval.
