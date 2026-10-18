import { client, equal } from "./harness.js";
const make = () => client("/pool-worker.js");
const open = async (c, pool) => {
  const result = await c.call("open", { pool });
  equal(result, { admitted: true, nestedWorkers: 0, pragmas: [[["delete"]], [[2]], [[1]]] });
};
const seed = (c) =>
  c.call("sql", {
    sql: "CREATE TABLE IF NOT EXISTS marker(id INTEGER PRIMARY KEY); INSERT OR IGNORE INTO marker VALUES(42);",
  });
const check = async (c, expected = [[42]]) => {
  equal(await c.call("sql", { sql: "SELECT * FROM marker;" }), expected);
  equal(await c.call("sql", { sql: "PRAGMA integrity_check;" }), [["ok"]]);
};
export async function baseline() {
  const cases = [];
  const run = async (id, action) => {
    const a = make();
    const b = make();
    try {
      await action(a, b);
      cases.push({ id, status: "passed" });
    } catch (error) {
      cases.push({ id, status: "failed", error: String(error) });
    } finally {
      a.terminate();
      b.terminate();
    }
  };
  await run("SAH-01", async (a, b) => {
    await open(a, "catalog");
    await seed(a);
    await a.call("close");
    await open(b, "catalog");
    await check(b);
    await b.call("close");
    await open(a, "catalog");
    await check(a);
    await a.call("close");
  });
  await run("SAH-02", async (a, b) => {
    await Promise.all([open(a, "left"), open(b, "right")]);
    await Promise.all([seed(a), seed(b)]);
    await Promise.all([check(a), check(b)]);
    await Promise.all([a.call("close"), b.call("close")]);
  });
  await run("SAH-03", async (a, b) => {
    await open(a, "held");
    await seed(a);
    equal(await b.call("open", { pool: "held" }), { admitted: false });
    await check(a);
    await a.call("close");
  });
  await run("SAH-04", async (a, b) => {
    await open(a, "crash");
    await seed(a);
    await a.call("sql", { sql: "BEGIN; INSERT INTO marker VALUES(99);" });
    a.terminate();
    await navigator.locks.request(
      "probe:pool:crash",
      { signal: AbortSignal.timeout(10000) },
      () => {},
    );
    await open(b, "crash");
    await check(b);
    await b.call("close");
  });
  await run("SAH-06", async (a) => {
    await open(a, "pause");
    await seed(a);
    equal(await a.call("pause-open"), { rejected: true });
    await check(a);
    await a.call("close");
  });
  return cases;
}
async function directory() {
  const root = await navigator.storage.getDirectory();
  return (await root.getDirectoryHandle(".probe-sah-canary")).getDirectoryHandle(".opaque");
}
export async function prepareCanary() {
  const c = make();
  try {
    await open(c, "canary");
    await seed(c);
    await check(c);
    await c.call("close");
  } finally {
    c.terminate();
  }
  for await (const [name, file] of await directory()) {
    const bytes = new Uint8Array(await (await file.getFile()).arrayBuffer());
    if (bytes[0] === 47) {
      if (bytes.length > 32768) throw new Error("Unexpected canary size");
      return { name, bytes: Array.from(bytes) };
    }
  }
  throw new Error("No synthetic mapped database canary found");
}
export async function damageCanary(name) {
  const c = make();
  try {
    await c.call("damage", { file: name });
    const initialized = await c.call("inspect-pool");
    const file = await (await directory()).getFileHandle(name);
    const bytes = Array.from(new Uint8Array(await (await file.getFile()).arrayBuffer()));
    return { id: "SAH-05", status: "observed", initialized, bytes };
  } finally {
    c.terminate();
  }
}
