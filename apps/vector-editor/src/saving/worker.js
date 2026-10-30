globalThis.sqlite3ApiConfig = { disable: { vfs: { opfs: true, "opfs-wl": true } } };
importScripts(
  "./sqlite3.js",
  "./catalog-generated.js",
  "./admission.js",
  "./hash-boundary.js",
  "./image-boundary-generated.js",
  "./text-boundary-generated.js",
  "./worker-hash.js",
  "./chunk-generated.js",
  "./chunk-schema.js",
  "./chunk-reader.js",
  "./chunk-store.js",
  "./legacy-replay.js",
  "./legacy-validation.js",
  "./chunk-validation.js",
  "./database.js",
  "./image-model.js",
  "./image-owner.js",
  "./image-assets.js",
  "./image-gc.js",
  "./staging.js",
  "./maintenance.js",
  "./pools.js",
  "./catalog-schema.js",
  "./catalog-actions.js",
  "./catalog.js",
  "./library-worker.js",
);
globalThis.sqliteReady = sqlite3InitModule({ print: () => {}, printErr: () => {} });
let db,
  pool,
  releaseLock,
  database,
  stage,
  assets,
  maintenance,
  busy = false,
  activeTransfer = false;
const safeError = (error) =>
  /^(storage-[a-z-]+|in-use)$/.test(error?.message) ? error.message : "storage-failed";
async function open(grant, document, reopen = false) {
  if (!validId(grant) || !drawingId(document) || db) throw Error("storage-state");
  return new Promise((resolve, reject) => {
    targetLock(document, async () => {
      try {
        const entry = await catalogGet(document);
        if (!entry || entry.state !== "ready") throw Error("storage-missing");
        const opened = await openPool(drawingLocation(document), "/drawing.sqlite", false);
        pool = opened.pool;
        db = opened.connection;
        database = await drawingDatabase(db, false, grant, document, entry.incarnation, reopen);
        if (database.identity.incarnation !== entry.incarnation) throw Error("storage-conflict");
        const originalCommit = database.commitChunks;
        database.commitChunks = async (...args) => {
          const receipt = await originalCommit(...args);
          // Drawing commit is authoritative; catalog activity is a retryable projection.
          try {
            await touchDrawing(document);
          } catch {}
          return receipt;
        };
        stage = staging(database);
        const garbage = imageGarbage(db, database, document, grant);
        assets = imageAssets(db, document, grant, garbage.changed);
        database.verifyImageModel = assets.verifyModel;
        database.verifyImageModelSteps = assets.verifyModelSteps;
        maintenance = checkpointMaintenance(database, garbage);
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
    if (activeTransfer && !["parts", "seal", "commit", "close"].includes(m.kind))
      throw Error("storage-state");
    if (m.kind?.startsWith("library-")) {
      if (db) throw Error("storage-state");
      value = await libraryCommand(m);
    } else if (m.kind === "open") value = await open(m.grant, m.document, m.reopen === true);
    else if (!db) throw Error("storage-closed");
    else if (m.kind === "maintain") value = await maintenance.step();
    else if (m.kind === "asset-maintain") value = await maintenance.step(m.revision);
    else if (m.kind === "maintenance-status") value = maintenance.status();
    else if (m.kind === "asset-stage")
      value = await assets.stage(m.blob, m.metadata, m.lease, m.owner);
    else if (m.kind === "asset-finish") value = assets.finish(m.lease, m.revision);
    else if (m.kind === "asset-hold") value = await assets.hold(m.lease, m.owner);
    else if (m.kind === "asset-release") value = assets.release(m.lease);
    else if (m.kind === "asset-verify") value = await assets.verify(m.references);
    else if (m.kind === "asset-read") value = await assets.read(m.digest);
    else if (m.kind === "load") value = await database.load();
    else if (m.kind === "read") value = database.read(m.operation, m.stream, m.chunk);
    else if (m.kind === "close") {
      activeTransfer = false;
      db.close();
      db = undefined;
      await pool.pauseVfs();
      releaseLock();
      releaseLock = undefined;
      value = null;
    } else {
      value = await stage(m);
      if (m.kind === "begin") activeTransfer = true;
      if (m.kind === "commit") activeTransfer = false;
    }
    const transfer = m.kind === "read" ? [value.bytes.buffer] : [];
    postMessage({ id: m.id, value }, transfer);
  } catch (e) {
    postMessage({ id: m.id, error: safeError(e) });
  } finally {
    busy = false;
  }
};
