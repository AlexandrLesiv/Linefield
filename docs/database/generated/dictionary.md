# Generated schema dictionary — v4.1

Generated from reference SQL, shared annotations and the documentation-only jobs proposal. Do not edit this output.

The 17-table/146-column/11-relationship shape is owner-approved by decisions 209/237. SQL constraints/constants, runtime mechanisms and implementation retain their separate review gates. No production migration is installed.

[Overview](overview.svg) · [Drawing](drawing.svg) · [Catalog](catalog.svg) · [Jobs](jobs.svg)

SQL reference tables are inspected in isolated in-memory SQLite databases. Jobs has no executable SQL definition and remains proposal-only. The resulting portable JSON is a generated review artifact for future shared tooling, not a new editor or persistence authority.

All source column/table notes survive below. Physical details absent from the original diagram notation are retained by exact reference CREATE SQL and indexes. Rust still owns transitions, contiguous sample order, identity validation, same-scope exact-set membership and cross-file recovery.

Failure preserves uncertain drawing bytes and recovery authority. Catalog publication cannot make separate drawing writes atomic; missing catalog authority does not authorize deletion. See [bootstrap contract](../empty-library-v1.md) and [removal contract](../deletion-v4/proposal.md) for trigger/state/outcome/invariant cases and test ownership.

## Inputs

- `shared/schema/annotations.json` — SHA256 `4927b91893571015d719aedc2ca5927713680c30d0acaf431f54a46b81c99c7f`
- `shared/schema/jobs-proposal.json` — SHA256 `b918f9ddc6aa37151ff2b012672d8d42706cce1c7cf90cb1eed24799ee5a9343`
- `docs/database/empty-library-catalog-v1.sql` — SHA256 `7fa28a640f6e403c726b453c0f884872447bc630ba948c7622db4f520c65e16b`
- `docs/database/empty-library-removal-v1.sql` — SHA256 `b181bd5fcfc8d95c1565a4772998648f20fae3be30e794260454c7302ad50a73`
- `docs/database/empty-library-drawing-v1.sql` — SHA256 `0b8a0cc968f02e41483a78062a1045afd12f8902366ed59b6fdbf4a5c4a557f4`

## catalog.departures

Authority: **reference-sql**.

Immutable acceptance receipt; one or more catalog.removals. Insert with exact members, scope closure and lifecycle cleanup intents in one catalog transaction. Lost reply queries this outcome; absence is not permission to replay.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| departure_id | BLOB | yes | PK position 1, unique | Committed departure operation UUID length16 |
| scope_id | BLOB | yes | unique | At most one committed departure per scope |
| argument_fingerprint | BLOB | yes |  | 32 bytes; binds canonical exact removal set and destination |
| destination_document_id | BLOB | yes |  | UUID length16; logical validated destination, no cross-file FK |
| destination_database_incarnation | BLOB | yes |  | UUID length16 |
| result_scope_revision | INTEGER | yes |  | Positive i64; matches committed closed scope |
| removal_count | INTEGER | yes |  | CHECK between 1 and 256; exact count/member equality checked in Rust transaction |

### Indexes

- `sqlite_autoindex_departures_1`: (departure_id); unique=true; primary=true; partial=false.
- `sqlite_autoindex_departures_2`: (scope_id); unique=true; primary=false; partial=false.
- `sqlite_autoindex_departures_3`: (departure_id, scope_id); unique=true; primary=false; partial=false.

### Foreign keys

- (scope_id) → catalog.removal_scopes (scope_id); DELETE RESTRICT; UPDATE RESTRICT. Same file only.

### Exact reference table SQL

```sql
CREATE TABLE departures (
  departure_id BLOB PRIMARY KEY NOT NULL CHECK(length(departure_id)=16),
  scope_id BLOB NOT NULL UNIQUE CHECK(length(scope_id)=16),
  argument_fingerprint BLOB NOT NULL CHECK(length(argument_fingerprint)=32),
  destination_document_id BLOB NOT NULL CHECK(length(destination_document_id)=16),
  destination_database_incarnation BLOB NOT NULL CHECK(length(destination_database_incarnation)=16),
  result_scope_revision INTEGER NOT NULL CHECK(result_scope_revision>0),
  removal_count INTEGER NOT NULL CHECK(removal_count BETWEEN 1 AND 256),
  UNIQUE(departure_id,scope_id),
  FOREIGN KEY(scope_id) REFERENCES removal_scopes(scope_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT
```

## catalog.drawings

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| drawing_key | INTEGER | yes | PK position 1 |  |
| document_id | BLOB | yes | unique |  |
| database_incarnation | BLOB | yes |  | Last observed drawing incarnation; repairable projection |
| managed_file_id | BLOB | yes | unique | Opaque app-managed locator; not a display name or source path |
| display_name | TEXT | yes |  |  |
| content_revision | INTEGER | yes |  |  |
| metadata_revision | INTEGER | yes |  |  |
| created_utc_us | INTEGER | yes |  |  |
| content_edited_utc_us | INTEGER | yes |  |  |
| added_utc_us | INTEGER | yes |  |  |
| activity_order | INTEGER | yes |  | Persistent local activity ordinal; descending order, timestamps remain independent |
| availability | TEXT | yes |  |  |

### Indexes

- `drawings_activity`: (activity_order, document_id); unique=false; primary=false; partial=false.

```sql
CREATE INDEX drawings_activity ON drawings(activity_order,document_id)
```

- `sqlite_autoindex_drawings_1`: (document_id); unique=true; primary=false; partial=false.
- `sqlite_autoindex_drawings_2`: (managed_file_id); unique=true; primary=false; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE drawings (
  drawing_key INTEGER PRIMARY KEY NOT NULL CHECK(drawing_key>0),
  document_id BLOB NOT NULL UNIQUE CHECK(length(document_id)=16),
  database_incarnation BLOB NOT NULL CHECK(length(database_incarnation)=16),
  managed_file_id BLOB NOT NULL UNIQUE CHECK(length(managed_file_id)=16),
  display_name TEXT NOT NULL CHECK(length(CAST(display_name AS BLOB)) BETWEEN 1 AND 1024 AND instr(display_name,char(0))=0),
  content_revision INTEGER NOT NULL CHECK(content_revision>=0),
  metadata_revision INTEGER NOT NULL CHECK(metadata_revision>=0),
  created_utc_us INTEGER NOT NULL,
  content_edited_utc_us INTEGER NOT NULL,
  added_utc_us INTEGER NOT NULL,
  activity_order INTEGER NOT NULL CHECK(activity_order>=0),
  availability TEXT NOT NULL CHECK(availability IN ('available','missing','inaccessible','invalid','unsupported','conflict'))
) STRICT
```

## catalog.library

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| singleton | INTEGER | yes | PK position 1 | CHECK(singleton = 1) |
| library_id | BLOB | yes | unique |  |
| catalog_incarnation | BLOB | yes |  | Fresh 16-byte UUID after rebuild/replacement |
| catalog_generation | INTEGER | yes |  |  |
| automatic_name_highwater | INTEGER | yes |  |  |
| activity_highwater | INTEGER | yes |  | Local monotonic gallery activity allocator; never use wall-clock time |
| sequence_recovery_state | TEXT | yes |  |  |

### Indexes

- `sqlite_autoindex_library_1`: (library_id); unique=true; primary=false; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE library (
  singleton INTEGER PRIMARY KEY NOT NULL CHECK(singleton=1),
  library_id BLOB NOT NULL UNIQUE CHECK(length(library_id)=16),
  catalog_incarnation BLOB NOT NULL CHECK(length(catalog_incarnation)=16),
  catalog_generation INTEGER NOT NULL CHECK(catalog_generation>=0),
  automatic_name_highwater INTEGER NOT NULL CHECK(automatic_name_highwater>=0),
  activity_highwater INTEGER NOT NULL CHECK(activity_highwater>=0),
  sequence_recovery_state TEXT NOT NULL CHECK(sequence_recovery_state IN ('known','unavailable'))
) STRICT
```

## catalog.lifecycle

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| operation_id | BLOB | yes | PK position 1, unique |  |
| document_id | BLOB | yes |  |  |
| managed_file_id | BLOB | yes |  |  |
| operation_kind | TEXT | yes |  |  |
| phase | TEXT | yes |  |  |
| expected_database_incarnation | BLOB | no |  | Required for existing-file operations; nullable before new-file staging |
| expected_content_revision | INTEGER | no |  |  |
| expected_metadata_revision | INTEGER | no |  |  |
| automatic_name_number | INTEGER | no |  |  |
| confirmed_utc_us | INTEGER | no |  |  |
| updated_utc_us | INTEGER | yes |  |  |

### Indexes

- `lifecycle_document_kind`: (document_id, operation_kind); unique=false; primary=false; partial=false.

```sql
CREATE INDEX lifecycle_document_kind ON lifecycle(document_id,operation_kind)
```

- `sqlite_autoindex_lifecycle_1`: (operation_id); unique=true; primary=true; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE lifecycle (
  operation_id BLOB PRIMARY KEY NOT NULL CHECK(length(operation_id)=16),
  document_id BLOB NOT NULL CHECK(length(document_id)=16),
  managed_file_id BLOB NOT NULL CHECK(length(managed_file_id)=16),
  operation_kind TEXT NOT NULL CHECK(operation_kind IN ('create','import','delete','upgrade','gallery_remove')),
  phase TEXT NOT NULL CHECK(phase IN ('reserved','staged','validated','published','confirmed','removing','terminal','blocked')),
  expected_database_incarnation BLOB CHECK(expected_database_incarnation IS NULL OR length(expected_database_incarnation)=16),
  expected_content_revision INTEGER CHECK(expected_content_revision IS NULL OR expected_content_revision>=0),
  expected_metadata_revision INTEGER CHECK(expected_metadata_revision IS NULL OR expected_metadata_revision>=0),
  automatic_name_number INTEGER CHECK(automatic_name_number IS NULL OR automatic_name_number>0),
  confirmed_utc_us INTEGER,
  updated_utc_us INTEGER NOT NULL,
  CHECK(operation_kind NOT IN ('delete','upgrade','gallery_remove') OR expected_database_incarnation IS NOT NULL),
  CHECK(operation_kind!='delete' OR phase NOT IN ('confirmed','removing','terminal') OR confirmed_utc_us IS NOT NULL),
  CHECK(operation_kind!='gallery_remove' OR (confirmed_utc_us IS NULL AND expected_content_revision IS NOT NULL AND expected_metadata_revision IS NOT NULL))
) STRICT
```

## catalog.local_view

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| drawing_key | INTEGER | yes | PK position 1 |  |
| preference_revision | INTEGER | yes |  |  |
| center_region_x | INTEGER | yes |  | Signed i64 saved viewport-center region; device-local preference |
| center_region_y | INTEGER | yes |  | Signed i64 saved viewport-center region; positive Y down |
| center_local_x | REAL | yes |  | Finite canonical local offset; CHECK(0 &lt;= value AND value &lt; 65536); +0 |
| center_local_y | REAL | yes |  | Finite canonical local offset; CHECK(0 &lt;= value AND value &lt; 65536); +0 |
| zoom | REAL | yes |  | CHECK(value BETWEEN 0.1 AND 8); 1 means 100 percent |
| active_tool_key | INTEGER | yes |  |  |

### Indexes


### Foreign keys

- (active_tool_key) → catalog.tools (tool_key); DELETE RESTRICT; UPDATE RESTRICT. Same file only.
- (drawing_key) → catalog.drawings (drawing_key); DELETE CASCADE; UPDATE RESTRICT. Same file only.

### Exact reference table SQL

```sql
CREATE TABLE local_view (
  drawing_key INTEGER PRIMARY KEY NOT NULL CHECK(drawing_key>0),
  preference_revision INTEGER NOT NULL CHECK(preference_revision>=0),
  center_region_x INTEGER NOT NULL,
  center_region_y INTEGER NOT NULL,
  center_local_x REAL NOT NULL CHECK(center_local_x>=0 AND center_local_x<65536),
  center_local_y REAL NOT NULL CHECK(center_local_y>=0 AND center_local_y<65536),
  zoom REAL NOT NULL CHECK(zoom BETWEEN 0.1 AND 8),
  active_tool_key INTEGER NOT NULL CHECK(active_tool_key>0),
  FOREIGN KEY(drawing_key) REFERENCES drawings(drawing_key) ON DELETE CASCADE ON UPDATE RESTRICT,
  FOREIGN KEY(active_tool_key) REFERENCES tools(tool_key) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT
```

## catalog.pen_preferences

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| drawing_key | INTEGER | yes | PK position 1 |  |
| tool_key | INTEGER | yes | PK position 2 |  |
| preference_revision | INTEGER | yes |  |  |
| width | REAL | yes |  | Maximum untransformed pen width; CHECK(value BETWEEN 1 AND 512) |
| red | REAL | yes |  |  |
| green | REAL | yes |  |  |
| blue | REAL | yes |  |  |
| alpha | REAL | yes |  |  |

### Indexes

- `sqlite_autoindex_pen_preferences_1`: (drawing_key, tool_key); unique=true; primary=true; partial=false.

### Foreign keys

- (tool_key) → catalog.tools (tool_key); DELETE RESTRICT; UPDATE RESTRICT. Same file only.
- (drawing_key) → catalog.drawings (drawing_key); DELETE CASCADE; UPDATE RESTRICT. Same file only.

### Exact reference table SQL

```sql
CREATE TABLE pen_preferences (
  drawing_key INTEGER NOT NULL CHECK(drawing_key>0),
  tool_key INTEGER NOT NULL CHECK(tool_key>0),
  preference_revision INTEGER NOT NULL CHECK(preference_revision>=0),
  width REAL NOT NULL CHECK(width BETWEEN 1 AND 512),
  red REAL NOT NULL CHECK(red BETWEEN 0 AND 1),
  green REAL NOT NULL CHECK(green BETWEEN 0 AND 1),
  blue REAL NOT NULL CHECK(blue BETWEEN 0 AND 1),
  alpha REAL NOT NULL CHECK(alpha BETWEEN 0 AND 1),
  PRIMARY KEY(drawing_key,tool_key),
  FOREIGN KEY(drawing_key) REFERENCES drawings(drawing_key) ON DELETE CASCADE ON UPDATE RESTRICT,
  FOREIGN KEY(tool_key) REFERENCES tools(tool_key) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT
```

## catalog.removal_scopes

Authority: **reference-sql**.

Current scope/fencing state, NOT a durable Create/Claim request receipt. One verified runtime grant holder. Lost acquisition results use live bounded request lookup or Unknown followed by verified retirement and fresh claim; never infer grant from row existence/generation. See proposal.md. No persisted credential or timeout takeover.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| scope_id | BLOB | yes | PK position 1, unique | UUID length16; runtime-created gallery visit, never a bearer capability |
| catalog_incarnation | BLOB | yes |  | UUID length16; Rust matches current library incarnation |
| claim_generation | INTEGER | yes |  | Nonnegative i64; checked increment on exclusive claim |
| scope_revision | INTEGER | yes |  | Nonnegative i64; optimistic command precondition |
| state | TEXT | yes |  | CHECK open or committed; transitions validated in Rust |

### Indexes

- `sqlite_autoindex_removal_scopes_1`: (scope_id); unique=true; primary=true; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE removal_scopes (
  scope_id BLOB PRIMARY KEY NOT NULL CHECK(length(scope_id)=16),
  catalog_incarnation BLOB NOT NULL CHECK(length(catalog_incarnation)=16),
  claim_generation INTEGER NOT NULL CHECK(claim_generation>=0),
  scope_revision INTEGER NOT NULL CHECK(scope_revision>=0),
  state TEXT NOT NULL CHECK(state IN ('open','committed'))
) STRICT
```

## catalog.removals

Authority: **reference-sql**.

SQL partial UNIQUE(document_id) WHERE state IN (staged,finalizing) is required but not expressible here. Stage preserves existing drawings row/name/activity position. Terminal receipts survive drawing deletion. SQL state-dependent null CHECKs and Rust transaction checks are specified in proposal.md.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| removal_id | BLOB | yes | PK position 1, unique | Stage operation UUID length16 |
| scope_id | BLOB | yes |  |  |
| stage_fingerprint | BLOB | yes |  | 32-byte versioned canonical semantic request digest; private |
| document_id | BLOB | yes |  | UUID length16; logical drawing reference, no SQL FK |
| managed_file_id | BLOB | yes |  | UUID length16; immutable managed target, no path |
| database_incarnation | BLOB | yes |  | UUID length16; exact expected instance |
| content_revision | INTEGER | yes |  | Nonnegative i64; exact protected revision |
| metadata_revision | INTEGER | yes |  | Nonnegative i64; exact protected revision |
| state | TEXT | yes |  | CHECK staged, restored, finalizing or cleaned; legal transitions Rust |
| undo_operation_id | BLOB | no | unique | UUID length16; present iff restored |
| undo_fingerprint | BLOB | no |  | 32 bytes; present iff restored together with undo_operation_id |
| departure_id | BLOB | no |  | UUID length16; present iff finalizing or cleaned |

### Indexes

- `removals_active_document`: (document_id); unique=true; primary=false; partial=true.

```sql
CREATE UNIQUE INDEX removals_active_document ON removals(document_id) WHERE state IN ('staged','finalizing')
```

- `removals_departure`: (departure_id, removal_id); unique=false; primary=false; partial=false.

```sql
CREATE INDEX removals_departure ON removals(departure_id,removal_id)
```

- `removals_scope_state`: (scope_id, state, removal_id); unique=false; primary=false; partial=false.

```sql
CREATE INDEX removals_scope_state ON removals(scope_id,state,removal_id)
```

- `sqlite_autoindex_removals_1`: (removal_id); unique=true; primary=true; partial=false.
- `sqlite_autoindex_removals_2`: (undo_operation_id); unique=true; primary=false; partial=false.

### Foreign keys

- (departure_id, scope_id) → catalog.departures (departure_id, scope_id); DELETE RESTRICT; UPDATE RESTRICT. Same file only.
- (scope_id) → catalog.removal_scopes (scope_id); DELETE RESTRICT; UPDATE RESTRICT. Same file only.

### Exact reference table SQL

```sql
CREATE TABLE removals (
  removal_id BLOB PRIMARY KEY NOT NULL CHECK(length(removal_id)=16),
  scope_id BLOB NOT NULL CHECK(length(scope_id)=16),
  stage_fingerprint BLOB NOT NULL CHECK(length(stage_fingerprint)=32),
  document_id BLOB NOT NULL CHECK(length(document_id)=16),
  managed_file_id BLOB NOT NULL CHECK(length(managed_file_id)=16),
  database_incarnation BLOB NOT NULL CHECK(length(database_incarnation)=16),
  content_revision INTEGER NOT NULL CHECK(content_revision>=0),
  metadata_revision INTEGER NOT NULL CHECK(metadata_revision>=0),
  state TEXT NOT NULL CHECK(state IN ('staged','restored','finalizing','cleaned')),
  undo_operation_id BLOB UNIQUE CHECK(undo_operation_id IS NULL OR length(undo_operation_id)=16),
  undo_fingerprint BLOB CHECK(undo_fingerprint IS NULL OR length(undo_fingerprint)=32),
  departure_id BLOB CHECK(departure_id IS NULL OR length(departure_id)=16),
  CHECK((state='restored' AND undo_operation_id IS NOT NULL AND undo_fingerprint IS NOT NULL) OR (state!='restored' AND undo_operation_id IS NULL AND undo_fingerprint IS NULL)),
  CHECK((state IN ('finalizing','cleaned') AND departure_id IS NOT NULL) OR (state IN ('staged','restored') AND departure_id IS NULL)),
  FOREIGN KEY(scope_id) REFERENCES removal_scopes(scope_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  FOREIGN KEY(departure_id,scope_id) REFERENCES departures(departure_id,scope_id) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT
```

## catalog.tools

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| tool_key | INTEGER | yes | PK position 1 |  |
| tool_id | BLOB | yes | unique |  |
| name_key | TEXT | yes | unique |  |

### Indexes

- `sqlite_autoindex_tools_1`: (tool_id); unique=true; primary=false; partial=false.
- `sqlite_autoindex_tools_2`: (name_key); unique=true; primary=false; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE tools (
  tool_key INTEGER PRIMARY KEY NOT NULL CHECK(tool_key>0),
  tool_id BLOB NOT NULL UNIQUE CHECK(length(tool_id)=16),
  name_key TEXT NOT NULL UNIQUE CHECK(length(CAST(name_key AS BLOB)) BETWEEN 1 AND 64 AND instr(name_key,char(0))=0)
) STRICT
```

## drawing.command_receipts

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| operation_id | BLOB | yes | PK position 1, unique | 16-byte command UUID; private committed outcome only |
| client_session_id | BLOB | yes |  | 16-byte authenticated-session binding; not itself a credential |
| client_sequence | INTEGER | yes |  |  |
| owner_generation | BLOB | yes |  | 16-byte generation under which command was admitted |
| database_incarnation | BLOB | yes |  |  |
| command_kind | TEXT | yes |  | add_stroke, move_stroke, scale_stroke, delete_stroke, undo, redo, rename |
| argument_fingerprint | BLOB | yes |  | 32-byte private validated-argument digest, never exported or logged |
| base_content_revision | INTEGER | yes |  |  |
| base_metadata_revision | INTEGER | yes |  |  |
| result_content_revision | INTEGER | yes |  |  |
| result_metadata_revision | INTEGER | yes |  |  |
| committed_utc_us | INTEGER | yes |  |  |

### Indexes

- `command_receipts_time`: (committed_utc_us, operation_id); unique=false; primary=false; partial=false.

```sql
CREATE INDEX command_receipts_time ON command_receipts(committed_utc_us,operation_id)
```

- `sqlite_autoindex_command_receipts_1`: (operation_id); unique=true; primary=true; partial=false.
- `sqlite_autoindex_command_receipts_2`: (owner_generation, client_session_id, client_sequence); unique=true; primary=false; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE command_receipts (
  operation_id BLOB PRIMARY KEY NOT NULL CHECK(length(operation_id)=16),
  client_session_id BLOB NOT NULL CHECK(length(client_session_id)=16),
  client_sequence INTEGER NOT NULL CHECK(client_sequence>0),
  owner_generation BLOB NOT NULL CHECK(length(owner_generation)=16),
  database_incarnation BLOB NOT NULL CHECK(length(database_incarnation)=16),
  command_kind TEXT NOT NULL CHECK(command_kind IN ('add_stroke','move_stroke','scale_stroke','delete_stroke','undo','redo','rename')),
  argument_fingerprint BLOB NOT NULL CHECK(length(argument_fingerprint)=32),
  base_content_revision INTEGER NOT NULL CHECK(base_content_revision>=0),
  base_metadata_revision INTEGER NOT NULL CHECK(base_metadata_revision>=0),
  result_content_revision INTEGER NOT NULL CHECK(result_content_revision>=0),
  result_metadata_revision INTEGER NOT NULL CHECK(result_metadata_revision>=0),
  committed_utc_us INTEGER NOT NULL,
  UNIQUE(owner_generation,client_session_id,client_sequence),
  CHECK((command_kind='rename' AND base_metadata_revision<9223372036854775807 AND result_metadata_revision=base_metadata_revision+1 AND result_content_revision=base_content_revision) OR (command_kind!='rename' AND base_content_revision<9223372036854775807 AND result_content_revision=base_content_revision+1 AND result_metadata_revision=base_metadata_revision))
) STRICT
```

## drawing.document

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| singleton | INTEGER | yes | PK position 1 | CHECK(singleton = 1) |
| document_id | BLOB | yes | unique | 16-byte UUIDv4 |
| database_incarnation | BLOB | yes |  | 16-byte instance UUID; changes on controlled replacement, not coordinator restart |
| display_name | TEXT | yes |  |  |
| content_revision | INTEGER | yes |  |  |
| metadata_revision | INTEGER | yes |  |  |
| created_utc_us | INTEGER | yes |  |  |
| content_edited_utc_us | INTEGER | yes |  |  |
| color_space | TEXT | yes |  | srgb only initially |

### Indexes

- `sqlite_autoindex_document_1`: (document_id); unique=true; primary=false; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE document (
  singleton INTEGER PRIMARY KEY NOT NULL CHECK(singleton=1),
  document_id BLOB NOT NULL UNIQUE CHECK(length(document_id)=16),
  database_incarnation BLOB NOT NULL CHECK(length(database_incarnation)=16),
  display_name TEXT NOT NULL CHECK(length(CAST(display_name AS BLOB)) BETWEEN 1 AND 1024 AND instr(display_name,char(0))=0),
  content_revision INTEGER NOT NULL CHECK(content_revision>=0),
  metadata_revision INTEGER NOT NULL CHECK(metadata_revision>=0),
  created_utc_us INTEGER NOT NULL,
  content_edited_utc_us INTEGER NOT NULL,
  color_space TEXT NOT NULL CHECK(color_space='srgb')
) STRICT
```

## drawing.samples

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| stroke_key | INTEGER | yes | PK position 1 |  |
| sample_index | INTEGER | yes | PK position 2 | Nonnegative contiguous from 0; sample 0 is derived immutable source anchor |
| region_x | INTEGER | yes |  | Signed i64 original region address |
| region_y | INTEGER | yes |  | Signed i64 original region address; positive Y down |
| local_x | REAL | yes |  | Finite canonical local offset; CHECK(0 &lt;= value AND value &lt; 65536); +0 |
| local_y | REAL | yes |  | Finite canonical local offset; CHECK(0 &lt;= value AND value &lt; 65536); +0 |
| pressure | REAL | no |  | NULL unavailable, otherwise 0..1 |

### Indexes

- `sqlite_autoindex_samples_1`: (stroke_key, sample_index); unique=true; primary=true; partial=false.

### Foreign keys

- (stroke_key) → drawing.strokes (stroke_key); DELETE CASCADE; UPDATE RESTRICT. Same file only.

### Exact reference table SQL

```sql
CREATE TABLE samples (
  stroke_key INTEGER NOT NULL CHECK(stroke_key>0),
  sample_index INTEGER NOT NULL CHECK(sample_index>=0),
  region_x INTEGER NOT NULL,
  region_y INTEGER NOT NULL,
  local_x REAL NOT NULL CHECK(local_x>=0 AND local_x<65536),
  local_y REAL NOT NULL CHECK(local_y>=0 AND local_y<65536),
  pressure REAL CHECK(pressure IS NULL OR pressure BETWEEN 0 AND 1),
  PRIMARY KEY(stroke_key,sample_index),
  FOREIGN KEY(stroke_key) REFERENCES strokes(stroke_key) ON DELETE CASCADE ON UPDATE RESTRICT
) STRICT
```

## drawing.strokes

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| stroke_key | INTEGER | yes | PK position 1 |  |
| stroke_id | BLOB | yes | unique | 16-byte UUIDv4 |
| mutation_revision | INTEGER | yes |  | Resulting content revision of last stroke mutation; fresh on Undo restoration |
| tool_key | INTEGER | yes |  |  |
| paint_order | INTEGER | yes | unique |  |
| base_width | REAL | yes |  | Logical units before transform; CHECK(value BETWEEN 1 AND 512) |
| red | REAL | yes |  |  |
| green | REAL | yes |  |  |
| blue | REAL | yes |  |  |
| alpha | REAL | yes |  |  |
| placement_region_x | INTEGER | yes |  | Signed i64 region address; Rust checked arithmetic |
| placement_region_y | INTEGER | yes |  | Signed i64 region address; positive Y down |
| placement_local_x | REAL | yes |  | Finite canonical local offset; CHECK(0 &lt;= value AND value &lt; 65536); +0 |
| placement_local_y | REAL | yes |  | Finite canonical local offset; CHECK(0 &lt;= value AND value &lt; 65536); +0 |
| uniform_scale | REAL | yes |  | CHECK(value BETWEEN 0.015625 AND 64); original points and base width preserved |

### Indexes

- `sqlite_autoindex_strokes_1`: (stroke_id); unique=true; primary=false; partial=false.
- `sqlite_autoindex_strokes_2`: (paint_order); unique=true; primary=false; partial=false.

### Foreign keys

- (tool_key) → drawing.tools (tool_key); DELETE RESTRICT; UPDATE RESTRICT. Same file only.

### Exact reference table SQL

```sql
CREATE TABLE strokes (
  stroke_key INTEGER PRIMARY KEY NOT NULL CHECK(stroke_key>0),
  stroke_id BLOB NOT NULL UNIQUE CHECK(length(stroke_id)=16),
  mutation_revision INTEGER NOT NULL CHECK(mutation_revision>0),
  tool_key INTEGER NOT NULL CHECK(tool_key>0),
  paint_order INTEGER NOT NULL UNIQUE CHECK(paint_order>=0),
  base_width REAL NOT NULL CHECK(base_width BETWEEN 1 AND 512),
  red REAL NOT NULL CHECK(red BETWEEN 0 AND 1),
  green REAL NOT NULL CHECK(green BETWEEN 0 AND 1),
  blue REAL NOT NULL CHECK(blue BETWEEN 0 AND 1),
  alpha REAL NOT NULL CHECK(alpha BETWEEN 0 AND 1),
  placement_region_x INTEGER NOT NULL,
  placement_region_y INTEGER NOT NULL,
  placement_local_x REAL NOT NULL CHECK(placement_local_x>=0 AND placement_local_x<65536),
  placement_local_y REAL NOT NULL CHECK(placement_local_y>=0 AND placement_local_y<65536),
  uniform_scale REAL NOT NULL CHECK(uniform_scale BETWEEN 0.015625 AND 64),
  FOREIGN KEY(tool_key) REFERENCES tools(tool_key) ON DELETE RESTRICT ON UPDATE RESTRICT
) STRICT
```

## drawing.tools

Authority: **reference-sql**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| tool_key | INTEGER | yes | PK position 1 |  |
| tool_id | BLOB | yes | unique | 16-byte stable UUID |
| name_key | TEXT | yes | unique | Stable machine key, not localized display text |

### Indexes

- `sqlite_autoindex_tools_1`: (tool_id); unique=true; primary=false; partial=false.
- `sqlite_autoindex_tools_2`: (name_key); unique=true; primary=false; partial=false.

### Foreign keys


### Exact reference table SQL

```sql
CREATE TABLE tools (
  tool_key INTEGER PRIMARY KEY NOT NULL CHECK(tool_key>0),
  tool_id BLOB NOT NULL UNIQUE CHECK(length(tool_id)=16),
  name_key TEXT NOT NULL UNIQUE CHECK(length(CAST(name_key AS BLOB)) BETWEEN 1 AND 64 AND instr(name_key,char(0))=0)
) STRICT
```

## jobs.snapshots

Authority: **proposal-only**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| snapshot_id | BLOB | yes | PK position 1 |  |
| managed_file_id | BLOB | yes | unique |  |
| document_id | BLOB | yes |  | Logical source identity only |
| source_database_incarnation | BLOB | yes |  | Captured source instance; independent snapshot has its own incarnation |
| content_revision | INTEGER | yes |  |  |
| metadata_revision | INTEGER | yes |  |  |
| byte_length | INTEGER | yes |  |  |
| digest_sha256 | BLOB | yes |  |  |
| state | TEXT | yes |  |  |

### Indexes


### Foreign keys


No executable SQL exists for this proposal table. Its constraints are not verified by SQL introspection.

## jobs.destinations

Authority: **proposal-only**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| destination_id | BLOB | yes | PK position 1 |  |
| access_kind | TEXT | yes |  |  |
| access_reference | BLOB | yes |  | Bounded host-native bookmark/grant; no generic command codec |
| target_identity | BLOB | no |  | Bounded native identity, NULL if no target existed |
| destination_serialization_key | BLOB | yes |  |  |

### Indexes


### Foreign keys


No executable SQL exists for this proposal table. Its constraints are not verified by SQL introspection.

## jobs.export_jobs

Authority: **proposal-only**.

| Column | Type | Required | Keys | Preserved review note |
| --- | --- | --- | --- | --- |
| job_id | BLOB | yes | PK position 1 |  |
| source_document_id | BLOB | yes |  |  |
| snapshot_id | BLOB | no |  |  |
| destination_id | BLOB | no |  |  |
| format | TEXT | yes |  |  |
| state | TEXT | yes |  |  |
| admission_instance_id | BLOB | yes |  |  |
| claim_instance_id | BLOB | no |  |  |
| claim_generation | INTEGER | yes |  |  |
| accepted_utc_us | INTEGER | yes |  |  |
| publication_phase | TEXT | yes |  |  |
| approved_target_identity | BLOB | no |  |  |
| outcome_code | TEXT | no |  |  |

### Indexes

- `export_jobs_review_0`: (state, accepted_utc_us, job_id); unique=false; primary=false; partial=false.
- `export_jobs_review_1`: (source_document_id, state); unique=false; primary=false; partial=false.

### Foreign keys

- (snapshot_id) → jobs.snapshots (snapshot_id); DELETE RESTRICT; UPDATE RESTRICT. Same file only.
- (destination_id) → jobs.destinations (destination_id); DELETE RESTRICT; UPDATE RESTRICT. Same file only.

No executable SQL exists for this proposal table. Its constraints are not verified by SQL introspection.

## Original review context

The following source note is preserved verbatim as migration provenance. Its original pending-status wording is historical; current disposition appears above.

```text
# Linefield S02 deletion amendment v4.1
PROPOSED AMENDMENT — NOT IMPLEMENTED OR SCHEMA-APPROVED, 2026-10-19.
The original regional v3 schema was approved in decision209; its tables are preserved below.
Decision236 approves durable-library sequencing and recoverable removal lifecycle, not these new mechanisms.
17 tables, 146 columns, 11 same-file relationships. Three namespaces represent separate SQLite files.
New catalog tables: removal_scopes, removals and departures. Drawing/jobs tables unchanged.
Stage preserves target bytes and Undo. Only an exact-set durable departure after destination readiness ends Undo.
No timeout finalization, persistent document edit Undo, new database or cross-file SQL foreign key.
Proposed scope ownership, acquisition reconciliation, bounds and partial SQL constraints require owner review.
See docs/database/deletion-v4/proposal.md for dictionary, sequence, migration and17 planned cases.
DBML is review documentation, not executable migrations. Exact browser lock/flush and generated contracts remain gates.
Private schema notes only; no drawing content, credentials or grants.
```
