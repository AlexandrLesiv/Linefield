import { client } from "./client.js";
export async function run() {
  const checks = [],
    snapshots = [];
  function equal(a, b) {
    if (JSON.stringify(a) !== JSON.stringify(b))
      throw Error(`mismatch ${JSON.stringify(a)} ${JSON.stringify(b)}`);
  }
  const open = async (c, pool, guarded = false) => {
    const result = await c.call("open", { pool, guarded });
    if (!result.admitted) throw Error(JSON.stringify(result));
  };
  const retired = (pool) =>
    navigator.locks.request(`save02:${pool}`, { signal: AbortSignal.timeout(15000) }, () => {});
  const seed = async (c) =>
    c.call("sql", {
      sql: "CREATE TABLE state(revision INTEGER PRIMARY KEY, value TEXT); CREATE TABLE receipts(id TEXT PRIMARY KEY, revision INTEGER); INSERT INTO state VALUES(0,'initial');",
    });
  let a = client(),
    b = client();
  try {
    await open(a, "receipt");
    await seed(a);
    const failedNotice = a.fault().then(
      () => false,
      () => true,
    );
    await a.call("sql", { sql: "SELECT nonexistent_column FROM state" }).catch(() => {});
    equal(await failedNotice, true);
    checks.push("pre-fault-error-settles-waiter");
    await a.call("sql", {
      sql: "BEGIN; INSERT INTO state VALUES(1,'saved'); INSERT INTO receipts VALUES('op1',1);",
    });
    const fault = a.fault();
    const lost = a.call("commit-lost-reply").catch(() => "unknown");
    equal(await fault, "commit-completed");
    a.terminate();
    await lost;
    await retired("receipt");
    await open(b, "receipt", true);
    equal(await b.call("sql", { sql: "SELECT revision FROM receipts WHERE id='op1'" }), [[1]]);
    equal(await b.call("sql", { sql: "PRAGMA integrity_check" }), [["ok"]]);
    checks.push("lost-reply-reconciled-committed");
    await b.call("sql", {
      sql: "BEGIN; INSERT INTO state VALUES(2,'unfinished'); INSERT INTO receipts VALUES('op2',2);",
    });
    b.terminate();
    await retired("receipt");
    b = client();
    await open(b, "receipt", true);
    equal(await b.call("sql", { sql: "SELECT revision FROM state ORDER BY revision" }), [[0], [1]]);
    equal(await b.call("sql", { sql: "SELECT revision FROM receipts WHERE id='op2'" }), []);
    checks.push("uncommitted-worker-death-rolls-back");
    await b.call("close");
    b.terminate();
    a = client();
    b = client();
    await open(a, "canary");
    await seed(a);
    await a.call("sql", {
      sql: "CREATE TABLE payload(bytes BLOB); INSERT INTO payload VALUES(zeroblob(16000));",
    });
    equal(await b.call("open", { pool: "canary", guarded: true }), {
      admitted: false,
      reason: "in-use",
    });
    checks.push("competing-owner-rejected");
    await a.call("close");
    a.terminate();
    a = client();
    const healthy = await a.call("inspect", { pool: "canary" });
    equal(healthy.admitted, true);
    const repeated = await a.call("inspect", { pool: "canary" });
    equal(healthy.files, repeated.files);
    checks.push("healthy-inspection-read-only");
    await a.call("damage", { pool: "canary" });
    const damaged = await a.call("inspect", { pool: "canary" });
    equal(damaged.admitted, false);
    const refused = await a.call("open", { pool: "canary", guarded: true });
    equal(refused.admitted, false);
    const unchanged = await a.call("inspect", { pool: "canary" });
    equal(damaged.files, unchanged.files);
    checks.push("damaged-admission-preserves-bytes");
    a.terminate();
    a = client();
    equal((await a.call("open", { pool: "canary", guarded: true })).admitted, false);
    equal((await a.call("inspect", { pool: "canary" })).files, damaged.files);
    checks.push("restart-refusal-preserves-bytes");
    snapshots.push({ healthy, damaged, unchanged });
    for (const variant of ["unknown", "empty"]) {
      await open(a, variant);
      await a.call("close");
      a.terminate();
      a = client();
      await a.call("damage", { pool: variant, variant });
      const before = await a.call("inspect", { pool: variant });
      equal(before.admitted, false);
      equal(before.reason, variant === "unknown" ? "unknown-flags-or-path" : "missing-drawing");
      equal((await a.call("open", { pool: variant, guarded: true })).admitted, false);
      equal((await a.call("inspect", { pool: variant })).files, before.files);
      checks.push(`${variant}-guard-preserves-files`);
      snapshots.push({ variant, before });
    }
    await a.call("copy-control");
    // Disposable negative control intentionally invokes known unsafe upstream initialization.
    await open(a, "control");
    await a.call("close");
    a.terminate();
    a = client();
    const afterUnsafe = await a.call("inspect", { pool: "control" });
    equal((await a.call("inspect", { pool: "canary" })).files, damaged.files);
    snapshots.push({ afterUnsafe });
    const beforeBytes = damaged.files.reduce((sum, file) => sum + file.size, 0),
      afterBytes = afterUnsafe.files.reduce((sum, file) => sum + file.size, 0);
    if (afterBytes >= beforeBytes) throw Error("known destructive negative control not reproduced");
    checks.push("unsafe-upstream-negative-control-truncation-reproduced");
    return {
      checks,
      snapshots,
      backend: "SAH-pool3.54.1",
      scope: "disposable pinned-layout admission and receipts; NOT production safety proof",
    };
  } finally {
    a.terminate();
    b.terminate();
  }
}
