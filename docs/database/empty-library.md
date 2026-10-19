# Empty-library format/bootstrap contract

Status: **concrete proposal, not implementation authorization or production migration**.
Prepared 2026-10-19 against fbcc30ca115d630d6c9e688b1525d3ee1dcc89d7 plus preserved work.
Database specialist owns this packet; Rust owns admission/commands and the generated statement
catalogue. Read [durable interface](../interfaces/durable-library.md),
[browser storage](../architecture/browser-storage.md), approved
[regional v3](regional-coordinates.md) and [removal v4.1](removal.md).
This makes the initial DDL/bootstrap proposal reviewable; it does not claim browser VFS proof.

## Exact resources and constants

| Database | Fixed DDL resources, executed in order inside initialization transaction | Proposed identity |
| --- | --- | --- |
| Catalog | [catalog](empty-library-catalog-v1.sql), then [removal tables](empty-library-removal-v1.sql) | application_id `0x4C464341` (ASCII LFCA), user_version `1` |
| Drawing | [drawing](empty-library-drawing-v1.sql) | application_id `0x4C464457` (ASCII LFDW), user_version `1` |

The two application IDs are proposed disambiguation constants, not registered file types or
security credentials. No deployed format requires version-number migration. Proposal v3/v4.1
does not mean user_version 3/4. Document and catalog versions evolve independently. Jobs DB is
not opened, initialized or assigned a new constant by this slice. No format compatibility with
the previous project is introduced.

Repository search found no approved numerical tool seed; decisions69/71 selected stable identity
but explicitly left constants to concrete review. Propose exactly one row in each `tools` table:

```sql
INSERT INTO tools(tool_key,tool_id,name_key)
VALUES(1,X'628F6E59A6594A91AA8A4F68067D1641','pen');
```

The canonical UUID is `628f6e59-a659-4a91-aa8a-4f68067d1641`; bytes use standard textual UUID
order, not a native GUID's mixed-endian layout. This is a fixed proposed registry constant, never
randomly regenerated per file/installation. `pen` is a machine key, not a localized label. Pan and
selection are not new persisted artwork-tool rows. No tool-version table or brush version field.
Exact seed/IDs need owner approval with this packet; existing schema approval is not approval of
previously unspecified constants. Unknown seed mappings are Unsupported, never dynamically loaded.

## SQL authority versus Rust authority

Reference SQL instantiates every v3 catalog/drawing column and v4.1 catalog column without adding
tables/columns. All tables are STRICT; no AUTOINCREMENT, virtual tables, triggers, views, extensions
or cross-database FKs. Explicit positive INTEGER primary keys remain local keys; UUIDs are identity.
SQLite's STRICT BLOB type plus length CHECK enforces binary size; optional values explicitly allow
NULL. UUID version/variant, canonical f64 positive zero, finite values and Unicode semantics remain
Rust checks. STRICT lossless coercion is not a substitute for validating typed bridge arguments.

The DDL supplies scalar domains, singleton key CHECKs, uniqueness, FK actions and regional local
bounds. SQL cannot enforce exactly one singleton row, sample contiguity/nonempty strokes, current
incarnation, mutation_revision <= document.content_revision, valid tool meaning, authoritative
managed-file identity, lifecycle state transitions or cross-file atomicity; Rust validates these.
Receipt kind-specific revision transitions are SQL CHECKs and independently validated by Rust;
non-no-op rename changes metadata only, other persisted mutation kinds change content only.
`client_sequence` is strictly positive for receipts; request admission must reject zero even though
the generic Counter type includes zero. Integer increment exhaustion rejects before SQL execution.

Names have SQL byte-length/NUL checks plus the interface's Rust scalar-count, single-line, trim
and unpaired-surrogate checks. Do not normalize user text or constrain display-name uniqueness.
Keep the v3 `(activity_order,document_id)` index; correct mixed-direction ordering comes from the
fixed query ORDER BY, not an unsupported index-performance claim. Measure paging before proposing
an index change. Local view/pen FK deletion cascades only their projection preferences.

V4.1 SQL implements same-scope composite departure FK, state-dependent nullability, active-removal
partial uniqueness and RESTRICT receipt dependencies. Membership/count, exact accepted set and
lifecycle-to-removal identity remain Rust checks. Confirmed legacy `delete` and committed
`gallery_remove` are different authority: the latter requires NULL confirmed_utc_us and validated
departure membership, never a fabricated timestamp. Initial empty-library admission requires all
three removal tables empty and lifecycle kinds only `create`; nonempty future removal state is
Unsupported by this implementation, preserved without cleanup. This excludes operation support,
not the agreed shape from the initialized catalog. No production Delete endpoint is exposed.

## Initialization transaction and crash boundary

1. Establish verified storage capabilities, trusted origin-private locator and exclusive ownership
   under the browser packet. Validate nonexistence using the actual VFS exclusive-create mechanism.
   Never infer a blank file from size zero or a failed read and overwrite existing bytes. A missing
   catalog with managed files enters recovery, not fresh-library initialization. Permission denied,
   unknown state, busy and unsupported storage are not evidence of a fresh installation.
2. Open only the newly reserved private file. Before BEGIN set/verify `foreign_keys=ON`,
   `trusted_schema=OFF`, extension loading disabled and defensive mode enabled through the fixed
   SQLite API. Set/verify browser `journal_mode=DELETE`, `synchronous=FULL`, `auto_vacuum=NONE`;
   no fallback to weaker settings. This does not change macOS WAL/FULL policy or enable F_FULLFSYNC.
3. `BEGIN IMMEDIATE`; execute the exact fixed DDL resources above; insert the exact Pen seed.
   For a fresh catalog insert the following bound statement, with Rust-generated UUIDv4 values
   frozen before execution. Reject duplicate library identity; no default random SQL function.

```sql
INSERT INTO library(singleton,library_id,catalog_incarnation,catalog_generation,
  automatic_name_highwater,activity_highwater,sequence_recovery_state)
VALUES(1,:libraryId,:catalogIncarnation,0,0,0,'known');
```

4. For a new drawing use D03 from the interface: one document singleton with frozen fresh
   document/incarnation/name/creation time, content_revision=metadata_revision=0, color_space=srgb,
   created_utc_us=content_edited_utc_us. There are no strokes, samples, receipts or preferences.
   Tool seed exists in both independent databases; the drawing never needs catalog joins to parse.
5. In the same transaction set the exact application_id and user_version values for that database.
   Read them back; check FK/domain/singleton/seed/empty-content invariants, then COMMIT. Rollback a
   proven failure; unknown COMMIT remains Unknown and closes/quarantines the connection for recovery.
   A known SQLite commit is the browser packet's measured persistence boundary, not eviction or
   hardware immunity. Never claim initialized/saved from schema creation or marker writes alone.
6. Close and reopen under retained ownership; run the admission validator below and compare exact
   frozen identity. Only after this succeeds can catalog publication expose the drawing. Drawing
   initialization and catalog publication are separate transactions/files; reservation IDs and name
   ordinal survive errors. Preserve partial files/failed new catalogs; no automatic erase-and-retry.

Changing PRAGMA values/schema on an existing file is not initialization. An unversioned file,
partially initialized file or unsupported version follows the explicit recovery classification.
Catalog reconstruction uses a distinct staged catalog with `sequence_recovery_state=unavailable`
and zero untrusted name highwater, never the fresh-library known-authority insertion above.
Unresolved lifecycle/removal authority is preserved; rebuilding projections does not restore it.
Publication/replacement of a reconstructed catalog remains gated by browser fault/fencing evidence.

## Hostile-file validator allowlist

Validation reads only through a fixed named bootstrap/validation catalogue, not arbitrary SQL from
UI/file content. Registry statement bodies and result shapes are build-generated and reviewed.
Required queries: `PRAGMA application_id`, `PRAGMA user_version`, `PRAGMA table_list`,
`SELECT type,name,tbl_name,sql FROM sqlite_schema ORDER BY type,name`, plus fixed literal
`PRAGMA table_xinfo('TABLE')`, `PRAGMA foreign_key_list('TABLE')`, `PRAGMA index_list('TABLE')`
and `PRAGMA index_xinfo('INDEX')` for each expected name. TABLE/INDEX are build-generated literals,
never concatenated untrusted identifiers. `PRAGMA quick_check(1)` and `PRAGMA foreign_key_check`
are necessary structure checks, not semantic acceptance or permission to repair.

The expected table lists are exact:

- Catalog: library, tools, drawings, local_view, pen_preferences, lifecycle, removal_scopes,
  departures, removals.
- Drawing: document, tools, strokes, samples, command_receipts.

Use an exact build-time manifest derived from these reviewed DDL resources under the pinned SQLite
build. Compare every column's order/name/declared type/not-null/default/PK/hidden status, table STRICT
and rowid flags, explicit/implicit index origin/uniqueness/key order/collation/direction/partial flag,
FK columns/actions and exact stored CREATE SQL text. The manifest includes expected SQLite-generated
autoindex names with NULL sql and the partial predicate; CHECK names alone are never validation.
If a different SQLite build changes canonical stored text, require a reviewed manifest change;
do not normalize away constraints. No arbitrary SQL-text interpreter or assumed CHECK equivalence.
`sqlite_schema` itself is the fixed internal schema table; reject extra persisted schema objects,
including unexpected sqlite_stat/sqlite_sequence objects, triggers/views or virtual/shadow tables.
No ANALYZE or VACUUM is run by validation. Missing/extra objects or mismatch rejects admission
without rewriting the source. Unsupported application/version is classified before migration.

Proposed validator bounds for this finite empty preview: 64 schema objects, 256 total columns,
256 FK/index-detail rows, 256KiB total schema SQL/text, 128 rows/256KiB per data page, 1MiB cumulative
validator scratch excluding charged SQLite heaps. Exceeding a cap is CapacityUnsupported, not
proof of corruption. SQLite busy timeout is zero; use bounded service retry after rollback.
Use sqlite3 progress interruption every 1,000 VM steps with cumulative 1,000,000-step query budget;
if the pinned binding cannot enforce it, validator adoption is blocked. This is CPU-work limiting,
not a hard wall-clock I/O timeout; a stalled worker requires the reviewed fencing/recovery path.
Limits are proposed admission caps, never portable artwork maxima or exhaustive parser protection.

After structural checks, read singletons and exact Pen seed; reject extra/missing seed/singleton,
invalid UUID byte semantics and invalid names. Apply D06 and require no strokes/samples; a valid
nonempty drawing is Unsupported by this slice, not corrupt or replaceable by a blank drawing.
Require document.content_revision=0 even when no strokes/samples remain: an empty future document
with prior content history is Unsupported before granting rename. Do not admit revision5 and then
create a receipt that this slice cannot accept on reopen. Metadata revision may be nonzero.
Stream receipts with a fixed 4,097-row sentinel bound, validate individual fields and cumulative
4,096/8MiB admission limits; only rename receipts with zero content revisions are supported here.
Validate document incarnation binding and result metadata <= current metadata. No absence/receipt
match authorizes replay. Scan create lifecycle via C15/C16 and revalidate every target before repair.
Catalog preferences may remain absent; any present preference is independently validated and
invalid local-view preference uses existing fallback, without declaring valid artwork corrupt.
Admission does not trust SQL constraints in a hostile file to have checked previous writes.

## Required verification and stop condition

CT-01/04/05/07, INV-01/06/07/09, SU-21; DLIB-01–05/09/11/12 and SEC-01/02/03/07/08/09 apply.
Database/Rust implementers own exact schema introspection, malformed UUID/type/length/name/counter,
FK/partial uniqueness/state-nullability and transaction rollback cases. Include bootstrap death
before markers, before/after COMMIT, after drawing reopen and before catalog publication; source
and consumed ordinals stay preserved. Unknown outcome never regenerates identity/name. Test missing,
extra/reordered schema objects, altered CHECK, forged same-name index, nonempty future state, schema
SQL budget, receipt caps, corrupt catalog and disk-full/denied storage at each stage. Test failed
reconstruction backup/publication separately; do not run migrations over uncertain source files.

No released migration is implemented. Synthetic pre-format fixtures require a verified recovery
copy and a separately reviewed conversion; version equality never permits silent repair. Runtime
schema introspection and conformance must use the actual adopted browser SQLite, with native parity
later. Node SQLite smoke execution of reference DDL is only syntax/constraint evidence, not browser
Wasm/OPFS, adversarial-validator, migration, crash or production durability acceptance. The lead
records exact source hashes, host SQLite version and actually executed cases separately.

Review this DDL/constants/bounds/validator contract with the interface and storage packets, obtain
independent security review and scoped owner approval before production implementation. Existing
schema approval remains intact; new constant/constraint/bound details are explicitly identified here.
