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
pub const MANIFEST: &str = r#"SELECT operation,base,result,digest,storage,streams,bytes,length(payload) FROM save_batches WHERE sequence>coalesce((SELECT cutoff FROM save_checkpoint WHERE singleton=1),0) OR operation=(SELECT operation FROM save_checkpoint WHERE singleton=1) ORDER BY CASE WHEN operation=(SELECT operation FROM save_checkpoint WHERE singleton=1) THEN 0 ELSE 1 END,sequence"#;
pub const INSERT_CHUNK: &str =
    r#"INSERT INTO save_chunks(storage,stream,chunk,last,data) VALUES(?,?,?,?,?)"#;
pub const RECEIPT: &str = r#"SELECT base,result,digest FROM save_receipts WHERE operation=?"#;
pub const PUBLISH_BATCH: &str = r#"INSERT INTO save_batches(operation,base,result,digest,payload,storage,streams,bytes) VALUES(?,?,?,?,X'',?,?,?)"#;
pub const UPDATE_HEAD: &str = r#"UPDATE save_head SET revision=? WHERE singleton=1"#;
pub const CLEANUP: &str = r#"DELETE FROM save_chunks WHERE rowid IN (SELECT rowid FROM save_chunks WHERE storage=? LIMIT 16)"#;
pub const CHANGES: &str = r#"SELECT changes()"#;
pub const LEGACY_MANIFEST: &str =
    r#"SELECT operation,base,result,digest,length(payload) FROM save_batches ORDER BY sequence"#;
pub const STREAM_SHAPE: &str = r#"SELECT coalesce(sum(length(data)),0),count(*),min(chunk),max(chunk),sum(last),max(CASE WHEN last=1 THEN chunk ELSE -1 END) FROM save_chunks WHERE storage=? AND stream=?"#;
pub const BATCH_SHAPE: &str =
    r#"SELECT count(DISTINCT stream),min(stream),max(stream) FROM save_chunks WHERE storage=?"#;
pub const CREATE_RECEIPTS: &str = r#"CREATE TABLE save_receipts(operation TEXT PRIMARY KEY,base TEXT NOT NULL,result TEXT NOT NULL,digest TEXT NOT NULL) STRICT"#;
pub const CREATE_CHECKPOINT: &str = r#"CREATE TABLE save_checkpoint(singleton INTEGER PRIMARY KEY CHECK(singleton=1),operation TEXT NOT NULL,cutoff INTEGER NOT NULL,epoch TEXT NOT NULL) STRICT"#;
pub const COPY_RECEIPTS: &str = r#"INSERT INTO save_receipts SELECT operation,base,result,digest FROM save_batches"#;
pub const VERSION_CHECKPOINT: &str = r#"PRAGMA user_version=3"#;
pub const INSERT_RECEIPT: &str = r#"INSERT INTO save_receipts(operation,base,result,digest) VALUES(?,?,?,?)"#;
pub const CHECKPOINT_HEAD: &str = r#"SELECT operation,cutoff,epoch FROM save_checkpoint WHERE singleton=1"#;
pub const CHECKPOINT_SET: &str = r#"INSERT INTO save_checkpoint VALUES(1,?,?,?) ON CONFLICT(singleton) DO UPDATE SET operation=excluded.operation,cutoff=excluded.cutoff,epoch=excluded.epoch"#;
pub const LAST_SEQUENCE: &str = r#"SELECT coalesce(max(sequence),0) FROM save_batches"#;
pub const GC_BATCHES: &str = r#"DELETE FROM save_batches WHERE sequence IN (SELECT sequence FROM save_batches WHERE sequence <= (SELECT cutoff FROM save_checkpoint WHERE singleton=1) AND operation != (SELECT operation FROM save_checkpoint WHERE singleton=1) ORDER BY sequence LIMIT 16)"#;
pub const MAINTENANCE_STATUS: &str = r#"SELECT count(*) FROM save_batches WHERE sequence > coalesce((SELECT cutoff FROM save_checkpoint WHERE singleton=1),0) AND operation != coalesce((SELECT operation FROM save_checkpoint WHERE singleton=1),'')"#;
pub const CREATE_EPOCH: &str = r#"CREATE TABLE save_epoch(singleton INTEGER PRIMARY KEY CHECK(singleton=1),grant TEXT NOT NULL,baseline TEXT NOT NULL) STRICT"#;
pub const EPOCH: &str = r#"SELECT grant,baseline FROM save_epoch WHERE singleton=1"#;
pub const EPOCH_SET: &str = r#"INSERT INTO save_epoch VALUES(1,?,?) ON CONFLICT(singleton) DO UPDATE SET grant=excluded.grant,baseline=excluded.baseline"#;
pub const CHECKPOINT_SEQUENCE: &str = r#"SELECT sequence FROM save_batches WHERE operation=?"#;
pub const ALL_MANIFEST: &str = r#"SELECT operation,base,result,digest,storage,streams,bytes,length(payload) FROM save_batches ORDER BY sequence"#;
pub const CREATE_GARBAGE: &str = r#"CREATE TABLE save_garbage(storage TEXT PRIMARY KEY) STRICT"#;
pub const DISCOVER_GARBAGE: &str = r#"INSERT INTO save_garbage SELECT DISTINCT storage FROM save_chunks WHERE storage NOT IN (SELECT storage FROM save_batches WHERE storage IS NOT NULL)"#;
pub const QUEUE_STORAGE: &str = r#"INSERT OR IGNORE INTO save_garbage VALUES(?)"#;
pub const KEEP_STORAGE: &str = r#"DELETE FROM save_garbage WHERE storage=?"#;
pub const GARBAGE: &str = r#"SELECT storage FROM save_garbage WHERE storage!=? AND storage!=? LIMIT 1"#;
pub const QUEUE_BATCHES: &str = r#"INSERT OR IGNORE INTO save_garbage SELECT storage FROM (SELECT storage FROM save_batches WHERE sequence <= (SELECT cutoff FROM save_checkpoint WHERE singleton=1) AND operation != (SELECT operation FROM save_checkpoint WHERE singleton=1) ORDER BY sequence LIMIT 16) WHERE storage IS NOT NULL"#;
pub const RECEIPT_COUNT: &str = r#"SELECT count(*) FROM save_receipts"#;
pub const CREATE_STORAGE_INDEX: &str = r#"CREATE INDEX save_batches_storage ON save_batches(storage)"#;
pub const REFERENCED_STORAGE: &str = r#"SELECT 1 FROM save_batches WHERE storage=? LIMIT 1"#;
