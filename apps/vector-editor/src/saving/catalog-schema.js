let catalogValidationCore;
async function prepareCatalog(sql, fresh) {
  catalogValidationCore ||= await storageCodec();
  const normalize = (text) => text.trim().replace(/\s+/g, " ");
  const check = (version) => {
    const expected = [
      ["drawings", catalogSql.createEntries],
      ["drawings_activity", catalogSql.createIndex],
      ["library", catalogSql.createLibrary],
      ...(version === 2
        ? [
            ["action_receipts", catalogSql.createReceipts],
            ["tombstones", catalogSql.createTombstones],
          ]
        : []),
    ].sort((a, b) => a[0].localeCompare(b[0]));
    const rows = sql(catalogSql.inspectSchema);
    if (
      rows.length !== expected.length ||
      rows.some(
        (row, i) =>
          row[0] !== expected[i][0] ||
          typeof row[1] !== "string" ||
          normalize(row[1]) !== normalize(expected[i][1]),
      )
    )
      throw Error("storage-catalog-corrupt");
  };
  let version = fresh ? 0 : sql("PRAGMA user_version")[0]?.[0];
  if (!fresh) {
    if (![1, catalogVersion].includes(version) || sql("PRAGMA quick_check")[0]?.[0] !== "ok")
      throw Error("storage-catalog-corrupt");
    check(version);
    const state = sql(catalogSql.libraryRead);
    if (
      state.length !== 1 ||
      state[0][0] !== 1 ||
      !Number.isSafeInteger(state[0][1]) ||
      state[0][1] < 1
    )
      throw Error("storage-catalog-corrupt");
  }
  if (version === catalogVersion) {
    await validateTombstones(sql);
    return;
  }
  if (!fresh)
    for (let offset = 0; ; offset += catalogLimits.pageSize) {
      const rows = sql(catalogSql.allEntries, [catalogLimits.pageSize, offset]);
      rows.forEach(catalogEntry);
      if (rows.length < catalogLimits.pageSize) break;
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  sql("BEGIN IMMEDIATE");
  try {
    if (fresh)
      for (const key of ["createLibrary", "initializeLibrary", "createEntries", "createIndex"])
        sql(catalogSql[key]);
    sql(catalogSql.createTombstones);
    sql(catalogSql.createReceipts);
    sql(`PRAGMA user_version=${catalogVersion}`);
    check(catalogVersion);
    sql("COMMIT");
  } catch (error) {
    sql("ROLLBACK");
    throw error;
  }
}
globalThis.prepareCatalog = prepareCatalog;

function validCatalogTitle(title) {
  if (typeof title !== "string" || !catalogValidationCore) return false;
  const bytes = new TextEncoder().encode(title);
  if (bytes.length > catalogLimits.titleBytes || new TextDecoder().decode(bytes) !== title)
    return false;
  const core = catalogValidationCore;
  new Uint8Array(core.memory.buffer, core.catalog_title_input_ptr(), bytes.length).set(bytes);
  return core.catalog_title_valid(bytes.length) === 1;
}
globalThis.validCatalogTitle = validCatalogTitle;

async function validateTombstones(sql) {
  for (let offset = 0; ; offset += catalogLimits.pageSize) {
    const rows = sql(catalogSql.tombstonePage, [catalogLimits.pageSize, offset]);
    for (const [document, incarnation, token, deleted, state, actual] of rows) {
      if (
        !drawingId(document) ||
        !validId(incarnation) ||
        !drawingId(token) ||
        token === "drawing" ||
        !Number.isSafeInteger(deleted) ||
        deleted < 0 ||
        deleted > catalogLimits.timestampMax ||
        state !== "ready" ||
        actual !== incarnation
      )
        throw Error("storage-catalog-corrupt");
    }
    if (rows.length < catalogLimits.pageSize) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
