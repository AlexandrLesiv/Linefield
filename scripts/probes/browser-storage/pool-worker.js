globalThis.sqlite3ApiConfig = { disable: { vfs: { opfs: true, "opfs-wl": true } } };
let nestedWorkers = 0;
globalThis.Worker = new Proxy(Worker, {
  construct(target, args) {
    nestedWorkers++;
    return Reflect.construct(target, args);
  },
});
importScripts("/vendor/sqlite3.js");
const ready = sqlite3InitModule({ print: () => {}, printErr: (...args) => console.error(...args) });
const pools = new Map();
let database;
let currentPool;
let release;
const query = (sql) => database.exec({ sql, rowMode: "array", returnValue: "resultRows" });
async function poolFor(name) {
  if (!/^[a-z]+$/.test(name)) throw new Error("Invalid synthetic pool name");
  const sqlite = await ready;
  if (!pools.has(name))
    pools.set(
      name,
      await sqlite.installOpfsSAHPoolVfs({
        name: `probe-${name}`,
        directory: `.probe-sah-${name}`,
        initialCapacity: 3,
        clearOnInit: false,
        preserveOnInitFailure: true,
        verbosity: 0,
      }),
    );
  const pool = pools.get(name);
  await pool.unpauseVfs();
  return pool;
}
async function dispatch(message) {
  if (message.kind === "inspect-pool")
    return navigator.locks.request("probe:pool:canary", async () => {
      const pool = await poolFor("canary");
      const names = pool.getFileNames();
      pool.pauseVfs();
      return { names, nestedWorkers };
    });
  if (message.kind === "open")
    return new Promise((resolve, reject) => {
      navigator.locks
        .request(`probe:pool:${message.pool}`, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            resolve({ admitted: false });
            return;
          }
          try {
            currentPool = await poolFor(message.pool);
            database = new currentPool.OpfsSAHPoolDb("/data.sqlite", "c");
            query("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
            const held = new Promise((done) => {
              release = done;
            });
            resolve({
              admitted: true,
              nestedWorkers,
              pragmas: [
                query("PRAGMA journal_mode"),
                query("PRAGMA synchronous"),
                query("PRAGMA foreign_keys"),
              ],
            });
            await held;
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
  if (message.kind === "sql") return query(message.sql);
  if (message.kind === "pause-open") {
    try {
      currentPool.pauseVfs();
      return { rejected: false };
    } catch {
      return { rejected: true };
    }
  }
  if (message.kind === "close") {
    database.close();
    database = undefined;
    currentPool.pauseVfs();
    release();
    return "closed-paused";
  }
  if (message.kind === "damage")
    return navigator.locks.request("probe:pool:canary", async () => {
      const root = await navigator.storage.getDirectory();
      const dir = await (
        await root.getDirectoryHandle(".probe-sah-canary")
      ).getDirectoryHandle(".opaque");
      const file = await dir.getFileHandle(message.file);
      const handle = await file.createSyncAccessHandle();
      try {
        handle.write(new Uint8Array([255]), { at: 0 });
        handle.flush();
      } finally {
        handle.close();
      }
      return "synthetic-metadata-damaged";
    });
  throw new Error("Unknown pool fixture command");
}
onmessage = async ({ data }) => {
  try {
    postMessage({ id: data.id, value: await dispatch(data) });
  } catch (error) {
    postMessage({ id: data.id, error: String(error) });
  }
};
