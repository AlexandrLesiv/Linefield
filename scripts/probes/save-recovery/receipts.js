// Disposable checkpoint executor. Opaque payloads are validated by Rust on reload.
globalThis.receiptCommand = async (db, m) => {
  const query = (sql, bind = []) =>
    db.exec({ sql, bind, rowMode: "array", returnValue: "resultRows" });
  const identity = (s) => typeof s === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(s);
  const revision = (s) =>
    typeof s === "string" && /^(0|[1-9][0-9]{0,19})$/.test(s) && BigInt(s) <= 18446744073709551615n;
  if (m.kind === "receipt-init") {
    if (![m.document, m.incarnation, m.grant].every(identity)) throw Error("identity");
    query(
      "CREATE TABLE IF NOT EXISTS save_head(singleton INTEGER PRIMARY KEY CHECK(singleton=1),document TEXT,incarnation TEXT,grant_id TEXT,revision TEXT)",
    );
    query(
      "CREATE TABLE IF NOT EXISTS save_batches(sequence INTEGER PRIMARY KEY,operation TEXT UNIQUE,base TEXT,result TEXT,digest TEXT,payload BLOB)",
    );
    query("CREATE TABLE IF NOT EXISTS save_grants(grant_id TEXT PRIMARY KEY)");
    query("INSERT INTO save_grants VALUES(?)", [m.grant]);
    query("INSERT INTO save_head VALUES(1,?,?,?,'0')", [m.document, m.incarnation, m.grant]);
    return "created";
  }
  const head = () =>
    query("SELECT document,incarnation,grant_id,revision FROM save_head WHERE singleton=1")[0];
  const authorized = () => {
    const h = head();
    if (!h || h[0] !== m.document || h[1] !== m.incarnation || h[2] !== m.grant)
      throw Error("authority");
    return h;
  };
  const capacity = (extra = 0) => {
    const [count, bytes] = query(
      "SELECT count(*),coalesce(sum(length(payload)),0) FROM save_batches",
    )[0];
    if (count > 128 || bytes + extra > 48 * 1024 * 1024) throw Error("capacity");
    return count;
  };
  if (m.kind === "receipt-load") {
    capacity();
    const h = authorized();
    return {
      revision: h[3],
      batches: query(
        "SELECT operation,base,result,digest,payload FROM save_batches ORDER BY sequence",
      ),
    };
  }
  if (m.kind === "receipt-reconcile") {
    authorized();
    const row = query("SELECT base,result,digest FROM save_batches WHERE operation=?", [
      m.operation,
    ])[0];
    if (!row) return { outcome: "unknown" };
    if (row[0] !== m.base || row[1] !== m.result || row[2] !== m.digest)
      throw Error("conflicting-body");
    return {
      outcome: "committed",
      document: m.document,
      operation: m.operation,
      base: row[0],
      result: row[1],
      digest: row[2],
      incarnation: m.incarnation,
      grant: m.grant,
    };
  }
  if (m.kind === "receipt-rotate") {
    if (!identity(m.nextGrant)) throw Error("identity");
    query("BEGIN IMMEDIATE");
    try {
      authorized();
      if (query("SELECT count(*) FROM save_grants")[0][0] >= 128) throw Error("grant-capacity");
      if (query("SELECT 1 FROM save_grants WHERE grant_id=?", [m.nextGrant]).length)
        throw Error("grant-reuse");
      query("INSERT INTO save_grants VALUES(?)", [m.nextGrant]);
      query("UPDATE save_head SET grant_id=? WHERE singleton=1", [m.nextGrant]);
      query("COMMIT");
      return "rotated";
    } catch (e) {
      query("ROLLBACK");
      throw e;
    }
  }
  if (m.kind !== "receipt-apply") throw Error("command");
  if (
    !identity(m.operation) ||
    !revision(m.base) ||
    !revision(m.result) ||
    BigInt(m.result) <= BigInt(m.base)
  )
    throw Error("revision");
  if (!(m.payload instanceof Uint8Array) || m.payload.byteLength > 48 * 1024 * 1024)
    throw Error("capacity");
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", m.payload)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== m.digest) throw Error("digest");
  query("BEGIN IMMEDIATE");
  try {
    const h = authorized();
    const old = query("SELECT base,result,digest FROM save_batches WHERE operation=?", [
      m.operation,
    ])[0];
    if (old) {
      if (old[0] !== m.base || old[1] !== m.result || old[2] !== digest)
        throw Error("conflicting-body");
    } else {
      if (h[3] !== m.base) throw Error("base-conflict");
      if (capacity(m.payload.byteLength) >= 128) throw Error("capacity");
      query("INSERT INTO save_batches(operation,base,result,digest,payload) VALUES(?,?,?,?,?)", [
        m.operation,
        m.base,
        m.result,
        digest,
        m.payload,
      ]);
      query("UPDATE save_head SET revision=? WHERE singleton=1", [m.result]);
    }
    if (m.fault === "before-commit") {
      postMessage({ faultPoint: "before-commit" });
      return new Promise(() => {});
    }
    query("COMMIT");
  } catch (e) {
    query("ROLLBACK");
    throw e;
  }
  if (m.fault === "after-commit") {
    postMessage({ faultPoint: "commit-completed" });
    return new Promise(() => {});
  }
  return {
    outcome: "committed",
    document: m.document,
    incarnation: m.incarnation,
    grant: m.grant,
    operation: m.operation,
    base: m.base,
    result: m.result,
    digest,
  };
};
