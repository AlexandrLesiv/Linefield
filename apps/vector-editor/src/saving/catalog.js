// Short catalog transactions. Callers obtain drawing ownership before targeted operations.
async function withCatalog(create, action) {
  return navigator.locks.request("linefield:v1:catalog", async () => {
    const opened = await openPool(catalogLocation, "/catalog.sqlite", create);
    const sql = (statement, bind = []) =>
      opened.connection.exec({ sql: statement, bind, rowMode: "array", returnValue: "resultRows" });
    try {
      await prepareCatalog(sql, opened.fresh);
      return await action(sql);
    } finally {
      await opened.close();
    }
  });
}
function catalogEntry(row) {
  if (!row) return null;
  const [id, title, created, updated, state, incarnation] = row;
  if (
    !drawingId(id) ||
    !validCatalogTitle(title) ||
    !Number.isSafeInteger(created) ||
    created < 0 ||
    created > catalogLimits.timestampMax ||
    !Number.isSafeInteger(updated) ||
    updated < 0 ||
    updated > catalogLimits.timestampMax ||
    !["pending", "ready"].includes(state) ||
    (state === "ready" && !validId(incarnation))
  )
    throw Error("storage-catalog-corrupt");
  return { id, title, created, updated, state, incarnation };
}
async function catalogGet(id) {
  if (!drawingId(id)) throw Error("storage-document");
  return withCatalog(false, (sql) => catalogEntry(sql(catalogSql.get, [id])[0]));
}
async function reserveDrawing(id, locale) {
  if (!drawingId(id) || !Object.hasOwn(catalogDefaultNames, locale))
    throw Error("storage-document");
  return withCatalog(false, (sql) => {
    sql("BEGIN IMMEDIATE");
    try {
      const old = catalogEntry(sql(catalogSql.rawGet, [id])[0]);
      if (sql(catalogSql.tombstone, [id]).length) throw Error("storage-deleted");
      if (old) {
        sql("COMMIT");
        return old;
      }
      const ordinal = sql(catalogSql.nameHighwater)[0]?.[0];
      if (!Number.isSafeInteger(ordinal) || ordinal < 1 || ordinal >= Number.MAX_SAFE_INTEGER)
        throw Error("storage-capacity");
      const title = catalogDefaultNames[locale].replace("{number}", String(ordinal)),
        now = Date.now();
      sql(catalogSql.advanceName, [ordinal]);
      sql(catalogSql.insertPending, [id, title, now, now]);
      const row = catalogEntry(sql(catalogSql.get, [id])[0]);
      sql("COMMIT");
      return row;
    } catch (error) {
      sql("ROLLBACK");
      throw error;
    }
  });
}
async function publishDrawing(id, incarnation) {
  return withCatalog(false, (sql) => {
    sql("BEGIN IMMEDIATE");
    try {
      if (sql(catalogSql.tombstone, [id]).length) throw Error("storage-deleted");
      const entry = catalogEntry(sql(catalogSql.get, [id])[0]);
      if (!entry || (entry.state === "ready" && entry.incarnation !== incarnation))
        throw Error("storage-conflict");
      if (entry.state === "pending") sql(catalogSql.publish, [incarnation, id]);
      const row = catalogEntry(sql(catalogSql.get, [id])[0]);
      sql("COMMIT");
      return row;
    } catch (error) {
      sql("ROLLBACK");
      throw error;
    }
  });
}
const touchDrawing = (id) =>
  withCatalog(false, (sql) => {
    sql(catalogSql.touch, [Date.now(), id]);
  });
globalThis.withCatalog = withCatalog;
globalThis.catalogEntry = catalogEntry;
globalThis.catalogGet = catalogGet;
globalThis.reserveDrawing = reserveDrawing;
globalThis.publishDrawing = publishDrawing;
globalThis.touchDrawing = touchDrawing;

async function catalogExists(id) {
  return withCatalog(false, (sql) => !!catalogEntry(sql(catalogSql.rawGet, [id])[0]));
}
globalThis.catalogExists = catalogExists;
