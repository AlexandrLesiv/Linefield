globalThis.sqlite3ApiConfig = { disable: { vfs: { opfs: true, "opfs-wl": true } } };
importScripts(
  "./sqlite3.js",
  "./catalog-generated.js",
  "./admission.js",
  "./database.js",
  "./staging.js",
  "./pools.js",
  "./catalog.js",
  "./library-worker.js",
);
globalThis.sqliteReady = sqlite3InitModule({ print: () => {}, printErr: () => {} });
let db,
  pool,
  releaseLock,
  database,
  stage,
  busy = false;
const safeError = (error) =>
  /^(storage-[a-z-]+|in-use)$/.test(error?.message) ? error.message : "storage-failed";
async function open(grant, document) {
  if (!validId(grant) || !drawingId(document) || db) throw Error("storage-state");
  return new Promise((resolve, reject) => {
    targetLock(document, async () => {
      try {
        const entry = await catalogGet(document);
        if (!entry || entry.state !== "ready") throw Error("storage-missing");
        const opened = await openPool(drawingLocation(document), "/drawing.sqlite", false);
        pool = opened.pool;
        db = opened.connection;
        database = drawingDatabase(db, false, grant, document);
        if (database.identity.incarnation !== entry.incarnation) throw Error("storage-conflict");
        const originalCommit = database.commit;
        database.commit = async (...args) => {
          const receipt = await originalCommit(...args);
          // Drawing commit is authoritative; catalog activity is a retryable projection.
          try {
            await touchDrawing(document);
          } catch {}
          return receipt;
        };
        stage = staging(database);
        const held = new Promise((done) => {
          releaseLock = done;
        });
        resolve(database.identity);
        await held;
      } catch (error) {
        try {
          db?.close();
          await pool?.pauseVfs();
        } catch {}
        db = undefined;
        reject(error);
      }
    }).catch(reject);
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
    if (m.kind?.startsWith("library-")) value = await libraryCommand(m);
    else if (m.kind === "open") value = await open(m.grant, m.document);
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
