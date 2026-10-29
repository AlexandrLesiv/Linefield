// Storage executor only: opaque Rust batches, transactional revision/head and exact retry receipts.
const MAX_BYTES = 48 * 1024 * 1024;
const validId = (s) => typeof s === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(s);
const validRevision = (s) =>
  typeof s === "string" && /^(0|[1-9][0-9]{0,19})$/.test(s) && BigInt(s) <= 18446744073709551615n;
const hashBytes = async (bytes) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
function drawingDatabase(db, fresh, grant) {
  const sql = (query, bind = []) =>
    db.exec({ sql: query, bind, rowMode: "array", returnValue: "resultRows" });
  if (fresh) {
    sql("BEGIN IMMEDIATE");
    try {
      sql(
        "CREATE TABLE save_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1), incarnation TEXT NOT NULL, revision TEXT NOT NULL)",
      );
      sql(
        "CREATE TABLE save_batches(sequence INTEGER PRIMARY KEY, operation TEXT UNIQUE NOT NULL, base TEXT NOT NULL, result TEXT NOT NULL, digest TEXT NOT NULL, payload BLOB NOT NULL)",
      );
      sql("INSERT INTO save_head VALUES(1,?,?)", [crypto.randomUUID(), "0"]);
      sql("PRAGMA user_version=1");
      sql("COMMIT");
    } catch (e) {
      sql("ROLLBACK");
      throw e;
    }
  } else {
    if (sql("PRAGMA user_version")[0]?.[0] !== 1) throw Error("storage-version");
    if (sql("PRAGMA quick_check")[0]?.[0] !== "ok") throw Error("storage-corrupt");
  }
  const h = sql("SELECT incarnation,revision FROM save_head WHERE singleton=1")[0];
  if (!h || !validId(h[0]) || !validRevision(h[1])) throw Error("storage-corrupt");
  const identity = { document: "drawing", incarnation: h[0], grant };
  const context = (m) => {
    if (
      !m ||
      Object.keys(m).some(
        (k) =>
          !["document", "incarnation", "grant", "operation", "base", "result", "digest"].includes(
            k,
          ),
      ) ||
      Object.keys(identity).some((k) => m[k] !== identity[k]) ||
      !validId(m.operation) ||
      !/^[0-9a-f]{64}$/.test(m.digest) ||
      !validRevision(m.base) ||
      !validRevision(m.result) ||
      BigInt(m.result) <= BigInt(m.base)
    )
      throw Error("storage-identity");
  };
  const capacity = (extra) => {
    const [count, bytes] = sql(
      "SELECT count(*),coalesce(sum(length(payload)),0) FROM save_batches",
    )[0];
    if (count > 10000 || (extra > 0 && count >= 10000) || bytes + extra > MAX_BYTES)
      throw Error("storage-capacity");
  };
  return {
    identity,
    context,
    async load() {
      capacity(0);
      const rows = sql(
        "SELECT operation,base,result,digest,payload FROM save_batches ORDER BY sequence",
      );
      for (const row of rows) if (row[4] instanceof Uint8Array) row[4] = row[4].slice();
      let revision = "0";
      for (const [operation, base, result, digest, payload] of rows) {
        if (
          !validId(operation) ||
          base !== revision ||
          !validRevision(result) ||
          BigInt(result) <= BigInt(base) ||
          !(payload instanceof Uint8Array) ||
          (await hashBytes(payload)) !== digest
        )
          throw Error("storage-corrupt");
        revision = result;
      }
      if (revision !== sql("SELECT revision FROM save_head WHERE singleton=1")[0][0])
        throw Error("storage-corrupt");
      return { identity, revision, rows };
    },
    async commit(m, payload, digest) {
      context(m);
      if (digest !== m.digest) throw Error("storage-digest");
      capacity(0);
      sql("BEGIN IMMEDIATE");
      try {
        const old = sql("SELECT base,result,digest FROM save_batches WHERE operation=?", [
          m.operation,
        ])[0];
        if (old) {
          if (old[0] !== m.base || old[1] !== m.result || old[2] !== digest)
            throw Error("storage-conflict");
        } else {
          if (sql("SELECT revision FROM save_head WHERE singleton=1")[0][0] !== m.base)
            throw Error("storage-conflict");
          capacity(payload.byteLength);
          sql("INSERT INTO save_batches(operation,base,result,digest,payload) VALUES(?,?,?,?,?)", [
            m.operation,
            m.base,
            m.result,
            digest,
            payload,
          ]);
          sql("UPDATE save_head SET revision=? WHERE singleton=1", [m.result]);
        }
        sql("COMMIT");
      } catch (e) {
        sql("ROLLBACK");
        throw e;
      }
      return { ...m, digest, outcome: "committed" };
    },
  };
}
globalThis.drawingDatabase = drawingDatabase;
globalThis.hashBytes = hashBytes;
