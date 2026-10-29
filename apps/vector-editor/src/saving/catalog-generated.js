// Generated from crates/vector-engine/src/catalog/mod.rs. Do not edit.
export const catalogVersion = 1;
export const catalogLimits = Object.freeze({"pageSize":128,"titleBytes":1024,"titleScalars":256,"timestampMax":8640000000000000});
export const catalogIdPattern = "^(?:drawing|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$";
export const catalogDefaultNames = Object.freeze({"en":"Untitled {number}","uk":"Без назви {number}"});
export const catalogSql = Object.freeze({
  "createLibrary": "CREATE TABLE library(singleton INTEGER PRIMARY KEY CHECK(singleton=1),next_name INTEGER NOT NULL CHECK(next_name BETWEEN 1 AND 9007199254740991)) STRICT",
  "initializeLibrary": "INSERT INTO library(singleton,next_name) VALUES(1,1)",
  "createEntries": "CREATE TABLE drawings(document TEXT PRIMARY KEY NOT NULL CHECK(length(document) BETWEEN 1 AND 64),title TEXT NOT NULL CHECK(length(CAST(title AS BLOB)) BETWEEN 1 AND 1024 AND instr(title,char(0))=0),created INTEGER NOT NULL CHECK(created BETWEEN 0 AND 8640000000000000),updated INTEGER NOT NULL CHECK(updated BETWEEN 0 AND 8640000000000000),state TEXT NOT NULL CHECK(state IN ('pending','ready')),incarnation TEXT,CHECK((state='pending' AND incarnation IS NULL) OR (state='ready' AND incarnation IS NOT NULL AND length(incarnation) BETWEEN 1 AND 64))) STRICT",
  "createIndex": "CREATE INDEX drawings_activity ON drawings(state,updated DESC,document)",
  "list": "SELECT document,title,created,updated,state,incarnation FROM drawings WHERE state='ready' ORDER BY updated DESC,document LIMIT ? OFFSET ?",
  "pending": "SELECT document,title,created,updated,state,incarnation FROM drawings WHERE state='pending' ORDER BY created,document LIMIT ? OFFSET ?",
  "get": "SELECT document,title,created,updated,state,incarnation FROM drawings WHERE document=?",
  "insertPending": "INSERT INTO drawings(document,title,created,updated,state,incarnation) VALUES(?,?,?,?,'pending',NULL)",
  "publish": "UPDATE drawings SET state='ready',incarnation=? WHERE document=? AND state='pending'",
  "touch": "UPDATE drawings SET updated=max(updated,?) WHERE document=? AND state='ready'",
  "nameHighwater": "SELECT next_name FROM library WHERE singleton=1",
  "advanceName": "UPDATE library SET next_name=next_name+1 WHERE singleton=1 AND next_name=? AND next_name<9007199254740991",
  "inspectSchema": "SELECT name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name",
  "libraryRead": "SELECT singleton,next_name FROM library"
});
