# Shared schema review definitions

These inputs generate the schema review JSON, native SVG views and complete dictionary. They do
not implement persistence, a host runtime or a production migration.

- The three unchanged `docs/database/empty-library-*-v1.sql` resources define the 14 reference
  catalog/drawing tables. Generation executes them only in independent in-memory Node SQLite
  databases and introspects their columns, keys, indexes, foreign keys and exact CREATE SQL.
- `annotations.json` owns prose keyed by stable table/column identifiers. Its project
  note is editorially normalized historical context; original bytes remain in Git, including the old pending-status wording; decisions
  209/237 supply the current shape approval. Missing or surplus annotations fail generation.
- `jobs-proposal.json` describes three jobs tables and two relationships for review only. No
  jobs DDL or runtime is invented. Future export implementation remains separately authorized.
- `schema.json` is generated portable data, intended for later shared tooling and host resource
  generation. Native applications must not become independent schema or editing authorities.
- `review-baseline.json` is an immutable conversion fixture, not an authoring source. It records
  all 17 tables, 146 columns, 11 relationships, original notes/indexes/groups and the prior Git
  revision/source hash. Tests compare conversion semantics and unchanged reference SQL hashes.

Run `node scripts/schema/generate.ts`; `--check` detects missing/stale outputs without writing.
Run `node --test scripts/schema/schema.test.ts scripts/probes/library-schema/constraints.test.ts`.
The generator uses the shared DTCG diagram tokens and strict SVG renderer. No hosted tool,
authentication, network access, SQL translation dependency or external SVG resource is used.

Generation validates identifiers, unique field names, index members, same-file relationship
targets and unconditional candidate keys. It builds all outputs before publication, then replaces
each file atomically. A disk-full write preserves that destination's previous version and may
leave a `.tmp` file; interruption between replacements can leave mixed generations, which
`--check` rejects. This is development artifact handling, not durable drawing publication.

The output preserves partial-index predicates and composite FKs; a partial UNIQUE index never
marks the whole column globally unique. SQL and Rust responsibilities remain separate: complete
sample ordering, UUID semantics, exact removal-set membership, ownership and cross-file recovery
are not inferred from the visual structure. SQL constraint tests are in-memory evidence only.

Future authorized migrations remain executable authority. Regenerate the shared review manifest
from their inspected structure, update annotations and fixtures through review, then verify each
adopted SQLite platform. Do not hand-edit generated JSON or let it override actual migrations.
