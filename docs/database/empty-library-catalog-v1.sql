-- Proposed reference DDL, not an installed migration. See empty-library-v1.md.
CREATE TABLE library (
  singleton INTEGER PRIMARY KEY NOT NULL CHECK(singleton=1),
  library_id BLOB NOT NULL UNIQUE CHECK(length(library_id)=16),
  catalog_incarnation BLOB NOT NULL CHECK(length(catalog_incarnation)=16),
  catalog_generation INTEGER NOT NULL CHECK(catalog_generation>=0),
  automatic_name_highwater INTEGER NOT NULL CHECK(automatic_name_highwater>=0),
  activity_highwater INTEGER NOT NULL CHECK(activity_highwater>=0),
  sequence_recovery_state TEXT NOT NULL CHECK(sequence_recovery_state IN ('known','unavailable'))
) STRICT;
CREATE TABLE tools (
  tool_key INTEGER PRIMARY KEY NOT NULL CHECK(tool_key>0),
  tool_id BLOB NOT NULL UNIQUE CHECK(length(tool_id)=16),
  name_key TEXT NOT NULL UNIQUE CHECK(length(CAST(name_key AS BLOB)) BETWEEN 1 AND 64 AND instr(name_key,char(0))=0)
) STRICT;
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
) STRICT;
CREATE INDEX drawings_activity ON drawings(activity_order,document_id);
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
) STRICT;
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
) STRICT;
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
) STRICT;
CREATE INDEX lifecycle_document_kind ON lifecycle(document_id,operation_kind);
