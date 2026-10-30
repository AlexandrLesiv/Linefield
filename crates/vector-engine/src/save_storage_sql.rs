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

// IMG02 immutable originals are separate from journal chunk cleanup.
pub const CREATE_IMAGE_ASSETS: &str = r#"CREATE TABLE image_assets(document_id TEXT NOT NULL,digest TEXT NOT NULL CHECK(length(digest)=64),version INTEGER NOT NULL CHECK(version=1),mime INTEGER NOT NULL CHECK(mime IN (1,2,3)),width INTEGER NOT NULL CHECK(width>0),height INTEGER NOT NULL CHECK(height>0),bytes INTEGER NOT NULL CHECK(bytes>0 AND bytes<=16777216),payload BLOB NOT NULL CHECK(length(payload)=bytes),PRIMARY KEY(document_id,digest)) STRICT"#;
pub const INSERT_IMAGE_ASSET: &str = r#"INSERT OR IGNORE INTO image_assets(document_id,digest,version,mime,width,height,bytes,payload) VALUES(?,?,1,?,?,?,?,?)"#;
pub const READ_IMAGE_ASSET: &str = r#"SELECT version,mime,width,height,bytes,payload FROM image_assets WHERE document_id=?1 AND digest=?2 UNION ALL SELECT version,mime,width,height,bytes,payload FROM image_assets_large WHERE document_id=?1 AND digest=?2"#;
pub const IMAGE_ASSET_EXISTS: &str = r#"SELECT version,mime,width,height,bytes FROM image_assets WHERE document_id=?1 AND digest=?2 UNION ALL SELECT version,mime,width,height,bytes FROM image_assets_large WHERE document_id=?1 AND digest=?2"#;
pub const VERSION_IMAGES: &str = r#"PRAGMA user_version=4"#;
// IMG03 leases and proof-scoped roots; each DELETE repeats the candidate predicates.
pub const CREATE_ASSET_LEASES: &str = r#"CREATE TABLE image_asset_leases(token TEXT PRIMARY KEY,grant TEXT NOT NULL,digest TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('stage','published','export')),revision TEXT NOT NULL DEFAULT '') STRICT"#;
pub const CREATE_ASSET_ROOTS: &str = r#"CREATE TABLE image_asset_roots(proof TEXT NOT NULL,digest TEXT NOT NULL,PRIMARY KEY(proof,digest)) STRICT"#;
pub const INSERT_ASSET_LEASE: &str = r#"INSERT INTO image_asset_leases(token,grant,digest,kind,owner) VALUES(?,?,?,?,?)"#;
pub const PUBLISH_ASSET_LEASE: &str = r#"UPDATE image_asset_leases SET kind='published',revision=? WHERE token=? AND grant=? AND kind='stage'"#;
pub const RELEASE_ASSET_LEASE: &str = r#"DELETE FROM image_asset_leases WHERE token=? AND grant=?"#;
pub const INSERT_ASSET_ROOT: &str = r#"INSERT OR IGNORE INTO image_asset_roots(proof,digest) VALUES(?,?)"#;
pub const ASSET_GC_CANDIDATE: &str = r#"SELECT digest,bytes FROM image_assets WHERE document_id=?1 AND digest>?2 UNION ALL SELECT digest,bytes FROM image_assets_large WHERE document_id=?1 AND digest>?2 ORDER BY digest LIMIT 1"#;
pub const DELETE_ASSET_CANDIDATE: &str = r#"DELETE FROM image_assets WHERE document_id=? AND digest=? AND digest NOT IN (SELECT digest FROM image_asset_roots WHERE proof=?) AND NOT EXISTS(SELECT 1 FROM image_asset_leases WHERE digest=image_assets.digest OR digest='*')"#;
pub const RELEASE_OLD_ASSET_LEASES: &str = r#"DELETE FROM image_asset_leases WHERE token IN (SELECT token FROM image_asset_leases WHERE grant!=? AND kind!='export' AND owner='' LIMIT 32)"#;
pub const DELETE_OLD_ROOTS: &str = r#"DELETE FROM image_asset_roots WHERE rowid IN (SELECT rowid FROM image_asset_roots WHERE proof!=? LIMIT 32)"#;
pub const ASSET_GC_STATUS: &str = r#"SELECT sum(n),sum(bytes) FROM (SELECT count(*) AS n,coalesce(sum(bytes),0) AS bytes FROM image_assets WHERE document_id=?1 UNION ALL SELECT count(*) AS n,coalesce(sum(bytes),0) AS bytes FROM image_assets_large WHERE document_id=?1)"#;
pub const VERSION_ASSET_LEASES: &str = r#"PRAGMA user_version=5"#;

pub const RELEASE_SETTLED_LEASES: &str = r#"DELETE FROM image_asset_leases WHERE token IN (SELECT token FROM image_asset_leases WHERE grant=? AND kind='published' AND revision!='' AND (length(revision)<length(?) OR (length(revision)=length(?) AND revision<=?)) LIMIT 32)"#;
pub const CREATE_ASSET_LEASE_DIGEST_INDEX: &str = r#"CREATE INDEX image_asset_leases_digest ON image_asset_leases(digest)"#;

// IMG03 additive large-original partition: old image_assets bytes are never copied.
pub const CREATE_LARGE_IMAGE_ASSETS: &str = r#"CREATE TABLE image_assets_large(document_id TEXT NOT NULL,digest TEXT NOT NULL CHECK(length(digest)=64),version INTEGER NOT NULL CHECK(version=1),mime INTEGER NOT NULL CHECK(mime IN (1,2,3)),width INTEGER NOT NULL CHECK(width>0),height INTEGER NOT NULL CHECK(height>0),bytes INTEGER NOT NULL CHECK(bytes>16777216 AND bytes<=33554432),payload BLOB NOT NULL CHECK(length(payload)=bytes),PRIMARY KEY(document_id,digest)) STRICT"#;
pub const INSERT_LARGE_IMAGE_ASSET: &str = r#"INSERT OR IGNORE INTO image_assets_large(document_id,digest,version,mime,width,height,bytes,payload) VALUES(?,?,1,?,?,?,?,?)"#;
pub const DELETE_LARGE_ASSET_CANDIDATE: &str = r#"DELETE FROM image_assets_large WHERE document_id=? AND digest=? AND digest NOT IN (SELECT digest FROM image_asset_roots WHERE proof=?) AND NOT EXISTS(SELECT 1 FROM image_asset_leases WHERE digest=image_assets_large.digest OR digest='*')"#;
pub const VERSION_LARGE_IMAGE_ASSETS: &str = r#"PRAGMA user_version=6"#;

// IMG04 explicit owner-lock identity. Legacy empty owners are never guessed.
pub const ADD_ASSET_LEASE_OWNER: &str = r#"ALTER TABLE image_asset_leases ADD COLUMN owner TEXT NOT NULL DEFAULT '' CHECK(length(owner)<=256)"#;
pub const ASSET_LEASE_LOOKUP: &str = r#"SELECT grant,digest,kind,revision,owner FROM image_asset_leases WHERE token=?"#;
pub const ASSET_LEASE_CANDIDATE: &str = r#"SELECT token,grant,digest,kind,revision,owner FROM image_asset_leases WHERE token>? ORDER BY token LIMIT 1"#;
pub const DELETE_ABANDONED_ASSET_LEASE: &str = r#"DELETE FROM image_asset_leases WHERE token=? AND grant=? AND digest=? AND kind=? AND revision=? AND owner=? AND owner!=''"#;
pub const VERSION_ASSET_OWNERS: &str = r#"PRAGMA user_version=7"#;
pub const ASSET_OWNER_LOCK_PREFIX: &str = r#"linefield-asset-owner-v1:"#;

pub const CREATE_ASSET_LEASES_OWNED: &str = r#"CREATE TABLE image_asset_leases(token TEXT PRIMARY KEY,grant TEXT NOT NULL,digest TEXT NOT NULL,kind TEXT NOT NULL CHECK(kind IN ('stage','published','export')),revision TEXT NOT NULL DEFAULT '',owner TEXT NOT NULL DEFAULT '' CHECK(length(owner)<=256)) STRICT"#;
