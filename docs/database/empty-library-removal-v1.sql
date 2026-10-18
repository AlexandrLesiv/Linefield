-- Proposed reference DDL for accepted v4.1 shape; no deletion entry point is enabled.
CREATE TABLE removal_scopes (
  scope_id BLOB PRIMARY KEY NOT NULL CHECK(length(scope_id)=16),
  catalog_incarnation BLOB NOT NULL CHECK(length(catalog_incarnation)=16),
  claim_generation INTEGER NOT NULL CHECK(claim_generation>=0),
  scope_revision INTEGER NOT NULL CHECK(scope_revision>=0),
  state TEXT NOT NULL CHECK(state IN ('open','committed'))
) STRICT;
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
) STRICT;
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
) STRICT;
CREATE UNIQUE INDEX removals_active_document ON removals(document_id) WHERE state IN ('staged','finalizing');
CREATE INDEX removals_scope_state ON removals(scope_id,state,removal_id);
CREATE INDEX removals_departure ON removals(departure_id,removal_id);
