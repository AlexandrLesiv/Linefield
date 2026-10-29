globalThis.sqlite3ApiConfig = { disable: { vfs: { opfs: true, "opfs-wl": true } } };
importScripts("./sqlite3.js", "./admission.js", "./database.js", "./staging.js");
const sqliteReady = sqlite3InitModule({ print: () => {}, printErr: () => {} });
let db,
  pool,
  releaseLock,
  database,
  stage,
  busy = false;
const safeError = (error) =>
  /^(storage-[a-z-]+|in-use)$/.test(error?.message) ? error.message : "storage-failed";
async function open(grant) {
  if (!validId(grant) || db) throw Error("storage-state");
  return new Promise((resolve, reject) => {
    navigator.locks
      .request("linefield-save-v1", { ifAvailable: true }, async (lock) => {
        if (!lock) throw Error("in-use");
        try {
          const inspection = await inspectDrawingPool();
          const sqlite = await sqliteReady;
          pool = await sqlite.installOpfsSAHPoolVfs({
            name: "linefield-save-v1",
            directory: ".linefield-save-v1",
            initialCapacity: 3,
            clearOnInit: false,
            preserveOnInitFailure: true,
            verbosity: 0,
          });
          await pool.unpauseVfs();
          db = new pool.OpfsSAHPoolDb("/drawing.sqlite", "c");
          db.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
          database = drawingDatabase(db, inspection.fresh, grant);
          stage = staging(database);
          const held = new Promise((done) => {
            releaseLock = done;
          });
          resolve(database.identity);
          await held;
        } catch (e) {
          try {
            db?.close();
            await pool?.pauseVfs();
          } catch {}
          db = undefined;
          reject(e);
        }
      })
      .catch(reject);
  });
}
onmessage = async ({ data: m }) => {
  if (busy) {
    postMessage({ id: m.id, error: "storage-busy" });
    return;
  }
  busy = true;
  try {
    let value;
    if (m.kind === "open") value = await open(m.grant);
    else if (!db) throw Error("storage-closed");
    else if (m.kind === "load") value = await database.load();
    else if (m.kind === "close") {
      db.close();
      db = undefined;
      await pool.pauseVfs();
      releaseLock();
      releaseLock = undefined;
      value = null;
    } else value = await stage(m);
    const transfer = m.kind === "load" ? value.rows.map((row) => row[4].buffer) : [];
    postMessage({ id: m.id, value }, transfer);
  } catch (e) {
    postMessage({ id: m.id, error: safeError(e) });
  } finally {
    busy = false;
  }
};
