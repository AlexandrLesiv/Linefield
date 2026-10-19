import { client, equal } from "./harness.js";
export async function baseline(full = false) {
  const rows = [];
  const run = async (id, action) => {
    try {
      rows.push({ id, status: "passed", detail: await action() });
    } catch (error) {
      rows.push({ id, status: "failed", error: String(error) });
    }
  };
  await run("PROBE-01", async () => {
    const c = client();
    try {
      const result = await c.call("open", { lock: "probe:basic", file: "/basic.sqlite" });
      equal(result.admitted, true);
      equal(result.pragmas, [[["delete"]], [[2]], [[1]]]);
      await c.call("sql", {
        sql: "CREATE TABLE IF NOT EXISTS marker(id INTEGER PRIMARY KEY); INSERT OR IGNORE INTO marker VALUES(41);",
      });
      await c.call("close");
      return result;
    } finally {
      c.terminate();
    }
  });
  await run("PROBE-02", async () => {
    const c = client();
    try {
      await c.call("open", { lock: "probe:basic", file: "/basic.sqlite" });
      equal(await c.call("sql", { sql: "SELECT * FROM marker;" }), [[41]]);
      equal(await c.call("sql", { sql: "PRAGMA integrity_check;" }), [["ok"]]);
      await c.call("close");
    } finally {
      c.terminate();
    }
  });
  if (!full) return rows;
  await run("PROBE-03", async () => {
    const a = client();
    const b = client();
    try {
      await Promise.all([a.call("catalog", { value: 1 }), b.call("catalog", { value: 2 })]);
      await a.call("open", { lock: "probe:catalog", file: "/catalog.sqlite" });
      equal(await a.call("sql", { sql: "SELECT id FROM entries ORDER BY id;" }), [[1], [2]]);
      equal(await a.call("sql", { sql: "PRAGMA integrity_check;" }), [["ok"]]);
      await a.call("close");
    } finally {
      a.terminate();
      b.terminate();
    }
  });
  await run("PROBE-04", async () => {
    const a = client();
    const b = client();
    try {
      equal((await a.call("open", { lock: "probe:owner", file: "/owner.sqlite" })).admitted, true);
      equal((await b.call("open", { lock: "probe:owner", file: "/owner.sqlite" })).admitted, false);
      await a.call("close");
    } finally {
      a.terminate();
      b.terminate();
    }
  });
  for (const committed of [false, true]) {
    await run(committed ? "PROBE-06" : "PROBE-05", async () => {
      const a = client();
      const b = client();
      const lock = `probe:crash-${committed}`;
      const file = `/crash-${committed}.sqlite`;
      try {
        await a.call("open", { lock, file });
        await a.call("sql", {
          sql: "CREATE TABLE operations(id INTEGER PRIMARY KEY); BEGIN; INSERT INTO operations VALUES(9);",
        });
        if (committed) await a.call("sql", { sql: "COMMIT;" });
        a.terminate();
        await navigator.locks.request(lock, { signal: AbortSignal.timeout(10000) }, () => {});
        await b.call("open", { lock, file });
        equal(await b.call("sql", { sql: "SELECT id FROM operations;" }), committed ? [[9]] : []);
        equal(await b.call("sql", { sql: "PRAGMA integrity_check;" }), [["ok"]]);
        await b.call("close");
      } finally {
        a.terminate();
        b.terminate();
      }
    });
  }
  return rows;
}
export async function reopened() {
  const c = client();
  try {
    await c.call("open", { lock: "probe:basic", file: "/basic.sqlite" });
    equal(await c.call("sql", { sql: "SELECT * FROM marker;" }), [[41]]);
    equal(await c.call("sql", { sql: "PRAGMA integrity_check;" }), [["ok"]]);
    await c.call("close");
    return { id: "PROBE-08", status: "passed" };
  } finally {
    c.terminate();
  }
}
