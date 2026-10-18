import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

const root = new URL("../../../docs/database/", import.meta.url);
const id = (value: number) => Buffer.alloc(16, value);
const fingerprint = Buffer.alloc(32, 7);
function database(kind: "catalog" | "drawing"): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys=ON");
  db.exec(readFileSync(new URL(`empty-library-${kind}-v1.sql`, root), "utf8"));
  if (kind === "catalog")
    db.exec(readFileSync(new URL("empty-library-removal-v1.sql", root), "utf8"));
  return db;
}
function document(db: DatabaseSync): void {
  db.prepare("INSERT INTO document VALUES(1,?,?,'Untitled',0,0,1,1,'srgb')").run(id(1), id(2));
}
function scope(db: DatabaseSync, key: number): void {
  db.prepare("INSERT INTO removal_scopes VALUES(?,?,0,0,'open')").run(id(key), id(9));
}
function stage(db: DatabaseSync, key: number, scopeKey: number): void {
  db.prepare("INSERT INTO removals VALUES(?,?,?,?,?,?,0,0,'staged',NULL,NULL,NULL)").run(
    id(key),
    id(scopeKey),
    fingerprint,
    id(3),
    id(4),
    id(5),
  );
}

test("DLIB-SQL-01: exact DBML column parity and STRICT tables", () => {
  const dbml = readFileSync(new URL("deletion-v4/review.dbml", root), "utf8");
  let count = 0;
  for (const kind of ["catalog", "drawing"] as const) {
    using db = database(kind);
    for (const match of dbml.matchAll(/Table (catalog|drawing)\.(\w+)[^{]*\{([\s\S]*?)\n\}/g)) {
      if (match[1] !== kind) continue;
      const table = match[2];
      const body = match[3];
      assert.ok(table && body);
      const columns = [...body.matchAll(/^  (\w+) (?:INTEGER|BLOB|TEXT|REAL)\b/gm)].map(
        (m) => m[1],
      );
      assert.deepEqual(
        db
          .prepare(`PRAGMA table_info('${table}')`)
          .all()
          .map((row) => row.name),
        columns,
      );
      assert.equal(
        db.prepare("SELECT strict FROM pragma_table_list WHERE name=?").get(table)?.strict,
        1,
      );
      count++;
    }
  }
  assert.equal(count, 14);
});

test("DLIB-SQL-02: identity, name and scalar constraints reject invalid records", () => {
  using db = database("drawing");
  const insert = db.prepare("INSERT INTO document VALUES(1,?, ?,?,0,0,1,1,'srgb')");
  for (const name of ["", "a".repeat(1025), "bad\0name"])
    assert.throws(() => insert.run(id(1), id(2), name), /constraint/i);
  assert.throws(() => insert.run(Buffer.alloc(15), id(2), "Name"), /constraint/i);
  document(db);
  assert.throws(() => db.exec("UPDATE document SET metadata_revision=-1"), /constraint/i);
  assert.throws(
    () => db.exec("UPDATE document SET metadata_revision='text'"),
    /datatype|store TEXT/i,
  );
});

test("DLIB-SQL-03: failed receipt rolls back rename and preserves content", () => {
  using db = database("drawing");
  document(db);
  const receipt = db.prepare("INSERT INTO command_receipts VALUES(?,?,1,?,?,'rename',?,0,0,0,?,1)");
  db.exec("BEGIN; UPDATE document SET display_name='Renamed',metadata_revision=1");
  assert.throws(() => receipt.run(id(3), id(4), id(5), id(2), fingerprint, 2), /constraint/i);
  db.exec("ROLLBACK");
  assert.equal(db.prepare("SELECT display_name FROM document").get()?.display_name, "Untitled");
  db.exec("BEGIN; UPDATE document SET display_name='Renamed',metadata_revision=1");
  receipt.run(id(3), id(4), id(5), id(2), fingerprint, 1);
  db.exec("COMMIT");
  assert.equal(db.prepare("SELECT content_revision FROM document").get()?.content_revision, 0);
  assert.equal(db.prepare("SELECT count(*) AS n FROM command_receipts").get()?.n, 1);
});

test("DLIB-SQL-04: active removal uniqueness and Undo nullability", () => {
  using db = database("catalog");
  scope(db, 1);
  stage(db, 10, 1);
  assert.throws(() => stage(db, 11, 1), /UNIQUE/i);
  assert.throws(() => db.exec("UPDATE removals SET state='restored'"), /constraint/i);
  db.prepare("UPDATE removals SET state='restored',undo_operation_id=?,undo_fingerprint=?").run(
    id(12),
    fingerprint,
  );
  stage(db, 11, 1);
  assert.equal(db.prepare("SELECT count(*) AS n FROM removals").get()?.n, 2);
});

test("DLIB-SQL-05: departure cannot cross scopes or erase referenced authority", () => {
  using db = database("catalog");
  scope(db, 1);
  scope(db, 2);
  stage(db, 10, 1);
  db.prepare("INSERT INTO departures VALUES(?,?,?,?,?,1,1)").run(
    id(20),
    id(2),
    fingerprint,
    id(30),
    id(31),
  );
  assert.throws(
    () => db.prepare("UPDATE removals SET state='finalizing',departure_id=?").run(id(20)),
    /FOREIGN KEY/i,
  );
  assert.throws(
    () => db.prepare("DELETE FROM removal_scopes WHERE scope_id=?").run(id(1)),
    /FOREIGN KEY/i,
  );
  assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
});

test("DLIB-SQL-06: legacy deletion and gallery departure authority stay distinct", () => {
  using db = database("catalog");
  const insert = db.prepare("INSERT INTO lifecycle VALUES(?,?,?,?,?,?,?,?,NULL,?,1)");
  assert.throws(
    () => insert.run(id(1), id(2), id(3), "delete", "confirmed", id(4), 0, 0, null),
    /constraint/i,
  );
  assert.throws(
    () => insert.run(id(1), id(2), id(3), "gallery_remove", "removing", id(4), 0, 0, 1),
    /constraint/i,
  );
  insert.run(id(1), id(2), id(3), "gallery_remove", "removing", id(4), 0, 0, null);
});
