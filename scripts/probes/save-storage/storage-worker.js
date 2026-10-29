globalThis.sqlite3ApiConfig = { disable: { vfs: { opfs: true, "opfs-wl": true } } };
importScripts("/vendor/sqlite3.js", "/admission.js");
const ready = sqlite3InitModule({ print: () => {}, printErr: () => {} });
let database, pool, release;
const sql = (text) => database.exec({ sql: text, rowMode: "array", returnValue: "resultRows" });
async function dispatch(message) {
  const name = message.pool || "canary";
  if (!/^[a-z]+$/.test(name)) throw Error("invalid fixture namespace");
  if (message.kind === "inspect")
    return navigator.locks.request(`save02:${name}`, () => inspectPool(name));
  if (message.kind === "open")
    return new Promise((resolve, reject) => {
      navigator.locks
        .request(`save02:${name}`, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            resolve({ admitted: false, reason: "in-use" });
            return;
          }
          try {
            if (message.guarded) {
              const inspection = await inspectPool(name);
              if (!inspection.admitted) {
                resolve(inspection);
                return;
              }
            }
            const sqlite = await ready;
            pool = await sqlite.installOpfsSAHPoolVfs({
              name: `save02-${name}`,
              directory: `.save02-${name}`,
              initialCapacity: 3,
              clearOnInit: false,
              preserveOnInitFailure: true,
              verbosity: 0,
            });
            await pool.unpauseVfs();
            database = new pool.OpfsSAHPoolDb("/drawing.sqlite", "c");
            sql("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
            const held = new Promise((done) => {
              release = done;
            });
            resolve({
              admitted: true,
              pragmas: sql("PRAGMA synchronous"),
              version: sql("SELECT sqlite_version()"),
            });
            await held;
          } catch (error) {
            reject(error);
          }
        })
        .catch(reject);
    });
  if (message.kind === "sql") return sql(message.sql);
  if (message.kind === "commit-lost-reply") {
    sql("COMMIT");
    // Test controller learns the fault point; the normal request gets no receipt.
    postMessage({ faultPoint: "commit-completed" });
    return new Promise(() => {});
  }
  if (message.kind === "close") {
    database.close();
    pool.pauseVfs();
    release();
    return "closed";
  }
  if (message.kind === "copy-control")
    return navigator.locks.request("save02:canary", async () => {
      const root = await navigator.storage.getDirectory();
      const from = await (
        await root.getDirectoryHandle(".save02-canary")
      ).getDirectoryHandle(".opaque");
      const target = await (
        await root.getDirectoryHandle(".save02-control", { create: true })
      ).getDirectoryHandle(".opaque", { create: true });
      for await (const [fileName, source] of from) {
        const bytes = await (await source.getFile()).arrayBuffer();
        const handle = await (
          await target.getFileHandle(fileName, { create: true })
        ).createSyncAccessHandle();
        try {
          handle.write(bytes);
          handle.truncate(bytes.byteLength);
          handle.flush();
        } finally {
          handle.close();
        }
      }
      return "copied-disposable-control";
    });
  if (message.kind === "damage")
    return navigator.locks.request(`save02:${name}`, async () => {
      const root = await navigator.storage.getDirectory();
      const dir = await (
        await root.getDirectoryHandle(`.save02-${name}`)
      ).getDirectoryHandle(".opaque");
      for await (const [, file] of dir) {
        const bytes = new Uint8Array(await (await file.getFile()).arrayBuffer());
        if (bytes[0] !== 47) continue;
        const handle = await file.createSyncAccessHandle();
        try {
          if (message.variant === "unknown") {
            // Unknown flag with an otherwise valid v2 digest isolates admission's flags guard.
            bytes[512] |= 128;
            let h1 = 0xdeadbeef,
              h2 = 0x41c6ce57;
            for (const byte of bytes.subarray(0, 516)) {
              h1 = Math.imul(h1 ^ byte, 2654435761);
              h2 = Math.imul(h2 ^ byte, 104729);
            }
            const view = new DataView(bytes.buffer);
            view.setUint32(516, h1 >>> 0, true);
            view.setUint32(520, h2 >>> 0, true);
            handle.write(bytes.subarray(0, 524), { at: 0 });
          } else if (message.variant === "empty") {
            handle.write(new Uint8Array(524), { at: 0 });
            handle.truncate(4096);
          } else handle.write(new Uint8Array([255]), { at: 0 });
          handle.flush();
        } finally {
          handle.close();
        }
        return "damaged";
      }
      throw Error("no mapped canary");
    });
  throw Error("unknown fixture command");
}
onmessage = async ({ data }) => {
  try {
    postMessage({ id: data.id, value: await dispatch(data) });
  } catch (error) {
    postMessage({ id: data.id, error: String(error) });
  }
};
