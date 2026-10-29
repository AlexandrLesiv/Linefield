const drawingId = (id) => typeof id === "string" && new RegExp(catalogIdPattern).test(id);
const drawingLocation = (id) => {
  if (!drawingId(id)) throw Error("storage-document");
  return id === "drawing"
    ? { directory: ".linefield-save-v1", name: "linefield-save-v1", lock: "linefield-save-v1" }
    : {
        directory: `.linefield-drawing-v1-${id}`,
        name: `linefield-drawing-v1-${id}`,
        lock: `linefield:v1:drawing:${id}`,
      };
};
globalThis.catalogLocation = { directory: ".linefield-catalog-v1", name: "linefield-catalog-v1" };
async function openPool(location, filename, allowCreate) {
  const inspection = await inspectDrawingPool(location.directory, filename);
  if (inspection.fresh && !allowCreate) throw Error("storage-missing");
  const sqlite = await sqliteReady;
  const pool = await sqlite.installOpfsSAHPoolVfs({
    name: location.name,
    directory: location.directory,
    initialCapacity: 3,
    clearOnInit: false,
    preserveOnInitFailure: true,
    verbosity: 0,
  });
  await pool.unpauseVfs();
  let connection;
  try {
    connection = new pool.OpfsSAHPoolDb(filename, "c");
    connection.exec("PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;");
    return {
      connection,
      pool,
      fresh: inspection.fresh,
      async close() {
        connection.close();
        await pool.pauseVfs();
      },
    };
  } catch (error) {
    try {
      connection?.close();
      await pool.pauseVfs();
    } catch {}
    throw error;
  }
}
async function targetLock(id, action) {
  return navigator.locks.request(drawingLocation(id).lock, { ifAvailable: true }, (lock) => {
    if (!lock) throw Error("in-use");
    return action();
  });
}
globalThis.drawingId = drawingId;
globalThis.drawingLocation = drawingLocation;
globalThis.openPool = openPool;
globalThis.targetLock = targetLock;
