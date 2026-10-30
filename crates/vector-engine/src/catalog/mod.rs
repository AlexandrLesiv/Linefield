//! SAVE06 catalog executor contract. Rust owns this fixed statement catalogue;
//! browser adapters only bind validated fields and execute under exclusive ownership.
//! Creation reserves a stable identity before touching its separate drawing file.
//! Publication requires the validated incarnation; missing/corrupt files never become blank.
pub const VERSION: u32 = 2;
pub const PAGE_SIZE: usize = 128;
pub const TITLE_BYTES: usize = 1024;
pub const TITLE_SCALARS: usize = 256;
pub const TIMESTAMP_MAX: u64 = 8640000000000000;
pub const ID_PATTERN: &str =
    r#"^(?:drawing|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$"#;
pub const DEFAULT_EN: &str = r#"Untitled {number}"#;
pub const DEFAULT_UK: &str = r#"Без назви {number}"#;
pub const SQL_CREATE_LIBRARY: &str = r#"CREATE TABLE library(singleton INTEGER PRIMARY KEY CHECK(singleton=1),next_name INTEGER NOT NULL CHECK(next_name BETWEEN 1 AND 9007199254740991)) STRICT"#;
pub const SQL_INITIALIZE_LIBRARY: &str = r#"INSERT INTO library(singleton,next_name) VALUES(1,1)"#;
pub const SQL_CREATE_ENTRIES: &str = r#"CREATE TABLE drawings(document TEXT PRIMARY KEY NOT NULL CHECK(length(document) BETWEEN 1 AND 64),title TEXT NOT NULL CHECK(length(CAST(title AS BLOB)) BETWEEN 1 AND 1024 AND instr(title,char(0))=0),created INTEGER NOT NULL CHECK(created BETWEEN 0 AND 8640000000000000),updated INTEGER NOT NULL CHECK(updated BETWEEN 0 AND 8640000000000000),state TEXT NOT NULL CHECK(state IN ('pending','ready')),incarnation TEXT,CHECK((state='pending' AND incarnation IS NULL) OR (state='ready' AND incarnation IS NOT NULL AND length(incarnation) BETWEEN 1 AND 64))) STRICT"#;
pub const SQL_CREATE_INDEX: &str =
    r#"CREATE INDEX drawings_activity ON drawings(state,updated DESC,document)"#;
pub const SQL_LIST: &str = r#"SELECT document,title,created,updated,state,incarnation FROM drawings WHERE state='ready' AND NOT EXISTS(SELECT 1 FROM tombstones WHERE tombstones.document=drawings.document) ORDER BY updated DESC,document LIMIT ? OFFSET ?"#;
pub const SQL_PENDING: &str = r#"SELECT document,title,created,updated,state,incarnation FROM drawings WHERE state='pending' AND NOT EXISTS(SELECT 1 FROM tombstones WHERE tombstones.document=drawings.document) ORDER BY created,document LIMIT ? OFFSET ?"#;
pub const SQL_GET: &str = r#"SELECT document,title,created,updated,state,incarnation FROM drawings WHERE document=? AND NOT EXISTS(SELECT 1 FROM tombstones WHERE tombstones.document=drawings.document)"#;
pub const SQL_INSERT_PENDING: &str = r#"INSERT INTO drawings(document,title,created,updated,state,incarnation) VALUES(?,?,?,?,'pending',NULL)"#;
pub const SQL_PUBLISH: &str =
    r#"UPDATE drawings SET state='ready',incarnation=? WHERE document=? AND state='pending'"#;
pub const SQL_TOUCH: &str =
    r#"UPDATE drawings SET updated=max(updated,?) WHERE document=? AND state='ready'"#;
pub const SQL_NAME_HIGHWATER: &str = r#"SELECT next_name FROM library WHERE singleton=1"#;
pub const SQL_ADVANCE_NAME: &str = r#"UPDATE library SET next_name=next_name+1 WHERE singleton=1 AND next_name=? AND next_name<9007199254740991"#;

pub const SQL_INSPECT_SCHEMA: &str =
    r#"SELECT name,sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name"#;
pub const SQL_LIBRARY_READ: &str = r#"SELECT singleton,next_name FROM library"#;

pub fn valid_document(id: &str) -> bool {
    if id == "drawing" {
        return true;
    }
    let b = id.as_bytes();
    b.len() == 36
        && b.iter().enumerate().all(|(i, c)| match i {
            8 | 13 | 18 | 23 => *c == b'-',
            14 => *c == b'4',
            19 => matches!(c, b'8' | b'9' | b'a' | b'b'),
            _ => c.is_ascii_digit() || matches!(c, b'a'..=b'f'),
        })
}

pub fn valid_title(title: &str) -> bool {
    !title.is_empty()
        && title.len() <= TITLE_BYTES
        && title.chars().count() <= TITLE_SCALARS
        && title.trim() == title
        && !title
            .chars()
            .any(|c| c.is_control() || matches!(c, '\u{2028}' | '\u{2029}'))
}

pub fn default_title(ukrainian: bool, ordinal: u64) -> Option<String> {
    if ordinal == 0 || ordinal >= 9_007_199_254_740_991 {
        return None;
    }
    Some(
        (if ukrainian { DEFAULT_UK } else { DEFAULT_EN }).replace("{number}", &ordinal.to_string()),
    )
}

pub const SQL_CREATE_TOMBSTONES: &str = r#"CREATE TABLE tombstones(document TEXT PRIMARY KEY NOT NULL,incarnation TEXT NOT NULL,token TEXT UNIQUE NOT NULL,deleted INTEGER NOT NULL) STRICT"#;
pub const SQL_CREATE_RECEIPTS: &str = r#"CREATE TABLE action_receipts(operation TEXT PRIMARY KEY NOT NULL,kind TEXT NOT NULL,document TEXT NOT NULL,incarnation TEXT NOT NULL,expected TEXT NOT NULL,value TEXT NOT NULL) STRICT"#;
pub const SQL_RAW_GET: &str =
    r#"SELECT document,title,created,updated,state,incarnation FROM drawings WHERE document=?"#;
pub const SQL_TOMBSTONE: &str =
    r#"SELECT incarnation,token,deleted FROM tombstones WHERE document=?"#;
pub const SQL_RECEIPT: &str =
    r#"SELECT kind,document,incarnation,expected,value FROM action_receipts WHERE operation=?"#;
pub const SQL_INSERT_RECEIPT: &str = r#"INSERT INTO action_receipts VALUES(?,?,?,?,?,?)"#;
pub const SQL_RENAME: &str =
    r#"UPDATE drawings SET title=? WHERE document=? AND incarnation=? AND title=?"#;
pub const SQL_REMOVE: &str = r#"INSERT INTO tombstones VALUES(?,?,?,?)"#;
pub const SQL_UNDO: &str =
    r#"DELETE FROM tombstones WHERE document=? AND incarnation=? AND token=?"#;

pub const SQL_TOMBSTONE_PAGE: &str = r#"SELECT t.document,t.incarnation,t.token,t.deleted,d.state,d.incarnation FROM tombstones t LEFT JOIN drawings d ON d.document=t.document ORDER BY t.document LIMIT ? OFFSET ?"#;
pub const SQL_ALL_ENTRIES: &str = r#"SELECT document,title,created,updated,state,incarnation FROM drawings ORDER BY document LIMIT ? OFFSET ?"#;
