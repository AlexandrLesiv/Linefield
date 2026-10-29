//! Fixed SAVE07 storage statement catalogue; browser code binds parameters only.
pub const BEGIN: &str = r#"BEGIN IMMEDIATE"#;
pub const CREATE_HEAD: &str = r#"CREATE TABLE save_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1), incarnation TEXT NOT NULL, revision TEXT NOT NULL)"#;
pub const CREATE_LEGACY_BATCHES: &str = r#"CREATE TABLE save_batches(sequence INTEGER PRIMARY KEY, operation TEXT UNIQUE NOT NULL, base TEXT NOT NULL, result TEXT NOT NULL, digest TEXT NOT NULL, payload BLOB NOT NULL)"#;
pub const INSERT_HEAD: &str = r#"INSERT INTO save_head VALUES(1,?,?)"#;
pub const VERSION_LEGACY: &str = r#"PRAGMA user_version=1"#;
pub const COMMIT: &str = r#"COMMIT"#;
pub const ROLLBACK: &str = r#"ROLLBACK"#;
pub const VERSION: &str = r#"PRAGMA user_version"#;
pub const QUICK_CHECK: &str = r#"PRAGMA quick_check"#;
pub const HEAD: &str = r#"SELECT incarnation,revision FROM save_head WHERE singleton=1"#;
pub const REVISION: &str = r#"SELECT revision FROM save_head WHERE singleton=1"#;
pub const CREATE_CHUNKS: &str = r#"CREATE TABLE save_chunks(storage TEXT NOT NULL,stream INTEGER NOT NULL CHECK(stream>=0),chunk INTEGER NOT NULL CHECK(chunk>=0),last INTEGER NOT NULL CHECK(last IN (0,1)),data BLOB NOT NULL CHECK(length(data)<=65520),PRIMARY KEY(storage,stream,chunk)) STRICT"#;
pub const INSPECT_SCHEMA: &str =
    r#"SELECT name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name"#;
pub const ADD_STORAGE: &str = r#"ALTER TABLE save_batches ADD COLUMN storage TEXT"#;
pub const ADD_STREAMS: &str = r#"ALTER TABLE save_batches ADD COLUMN streams INTEGER"#;
pub const ADD_BYTES: &str = r#"ALTER TABLE save_batches ADD COLUMN bytes INTEGER"#;
pub const VERSION_CHUNKS: &str = r#"PRAGMA user_version=2"#;
pub const BATCH: &str = r#"SELECT operation,base,result,digest,storage,streams,bytes,length(payload) FROM save_batches WHERE operation=?"#;
pub const LEGACY_LENGTH: &str = r#"SELECT substr(payload,?,4) FROM save_batches WHERE operation=?"#;
pub const LEGACY_COUNT: &str = r#"SELECT substr(payload,1,4) FROM save_batches WHERE operation=?"#;
pub const LEGACY_PART: &str = r#"SELECT substr(payload,?,?) FROM save_batches WHERE operation=?"#;
pub const STREAM_LENGTH: &str =
    r#"SELECT coalesce(sum(length(data)),0) FROM save_chunks WHERE storage=? AND stream=?"#;
pub const CHUNK: &str =
    r#"SELECT data,last FROM save_chunks WHERE storage=? AND stream=? AND chunk=?"#;
pub const CAPACITY: &str =
    r#"SELECT count(*),coalesce(sum(coalesce(bytes,length(payload))),0) FROM save_batches"#;
pub const MANIFEST: &str = r#"SELECT operation,base,result,digest,storage,streams,bytes,length(payload) FROM save_batches ORDER BY sequence"#;
pub const INSERT_CHUNK: &str =
    r#"INSERT INTO save_chunks(storage,stream,chunk,last,data) VALUES(?,?,?,?,?)"#;
pub const RECEIPT: &str = r#"SELECT base,result,digest FROM save_batches WHERE operation=?"#;
pub const PUBLISH_BATCH: &str = r#"INSERT INTO save_batches(operation,base,result,digest,payload,storage,streams,bytes) VALUES(?,?,?,?,X'',?,?,?)"#;
pub const UPDATE_HEAD: &str = r#"UPDATE save_head SET revision=? WHERE singleton=1"#;
pub const CLEANUP: &str = r#"DELETE FROM save_chunks WHERE rowid IN (SELECT rowid FROM save_chunks WHERE storage NOT IN (SELECT storage FROM save_batches WHERE storage IS NOT NULL) LIMIT 16)"#;
pub const CHANGES: &str = r#"SELECT changes()"#;
pub const LEGACY_MANIFEST: &str =
    r#"SELECT operation,base,result,digest,length(payload) FROM save_batches ORDER BY sequence"#;
pub const STREAM_SHAPE: &str = r#"SELECT coalesce(sum(length(data)),0),count(*),min(chunk),max(chunk),sum(last),max(CASE WHEN last=1 THEN chunk ELSE -1 END) FROM save_chunks WHERE storage=? AND stream=?"#;
pub const BATCH_SHAPE: &str =
    r#"SELECT count(DISTINCT stream),min(stream),max(stream) FROM save_chunks WHERE storage=?"#;
