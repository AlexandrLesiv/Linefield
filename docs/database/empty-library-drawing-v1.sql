-- Proposed reference DDL, not an installed migration. See empty-library-v1.md.
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
) STRICT;
CREATE TABLE tools (
  tool_key INTEGER PRIMARY KEY NOT NULL CHECK(tool_key>0),
  tool_id BLOB NOT NULL UNIQUE CHECK(length(tool_id)=16),
  name_key TEXT NOT NULL UNIQUE CHECK(length(CAST(name_key AS BLOB)) BETWEEN 1 AND 64 AND instr(name_key,char(0))=0)
) STRICT;
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
) STRICT;
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
) STRICT;
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
) STRICT;
CREATE INDEX command_receipts_time ON command_receipts(committed_utc_us,operation_id);
