// Short catalog transactions. Callers obtain drawing ownership before targeted operations.
async function withCatalog(create, action) {
  return navigator.locks.request("linefield:v1:catalog", async () => {
    const opened = await openPool(catalogLocation, "/catalog.sqlite", create);
    const sql = (statement, bind = []) =>
      opened.connection.exec({ sql: statement, bind, rowMode: "array", returnValue: "resultRows" });
    try {
      if (opened.fresh) {
        sql("BEGIN IMMEDIATE");
        try {
          for (const key of ["createLibrary", "initializeLibrary", "createEntries", "createIndex"])
            sql(catalogSql[key]);
          sql(`PRAGMA user_version=${catalogVersion}`);
          sql("COMMIT");
        } catch (error) {
          sql("ROLLBACK");
          throw error;
        }
      } else if (
        sql("PRAGMA user_version")[0]?.[0] !== catalogVersion ||
        sql("PRAGMA quick_check")[0]?.[0] !== "ok"
      )
        throw Error("storage-catalog-corrupt");
      const schema = sql(catalogSql.inspectSchema);
      const normalize = (text) => text.trim().replace(/\s+/g, " ");
      const expected = [
        ["drawings", catalogSql.createEntries],
        ["drawings_activity", catalogSql.createIndex],
        ["library", catalogSql.createLibrary],
      ];
      if (
        schema.length !== expected.length ||
        schema.some(
          (row, i) =>
            row[0] !== expected[i][0] ||
            typeof row[1] !== "string" ||
            normalize(row[1]) !== normalize(expected[i][1]),
        )
      )
        throw Error("storage-catalog-corrupt");
      const state = sql(catalogSql.libraryRead);
      if (
        state.length !== 1 ||
        state[0][0] !== 1 ||
        !Number.isSafeInteger(state[0][1]) ||
        state[0][1] < 1
      )
        throw Error("storage-catalog-corrupt");
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
    typeof title !== "string" ||
    !title.trim() ||
    title.trim() !== title ||
    [...title].length > catalogLimits.titleScalars ||
    new TextEncoder().encode(title).length > catalogLimits.titleBytes ||
    [...title].some(
      (c) =>
        c.codePointAt(0) < 32 ||
        (c.codePointAt(0) >= 127 && c.codePointAt(0) <= 159) ||
        [0x2028, 0x2029].includes(c.codePointAt(0)),
    ) ||
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
      const old = catalogEntry(sql(catalogSql.get, [id])[0]);
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
