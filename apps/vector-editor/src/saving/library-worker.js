async function directories() {
  const root = await navigator.storage.getDirectory();
  let catalog = false,
    legacy = false,
    managed = false,
    count = 0;
  for await (const [name, handle] of root) {
    if (++count > 100000) throw Error("storage-capacity");
    if (handle.kind !== "directory") continue;
    catalog ||= name === ".linefield-catalog-v1";
    legacy ||= name === ".linefield-save-v1";
    managed ||= name.startsWith(".linefield-drawing-v1-");
  }
  return { catalog, legacy, managed };
}
async function validateDrawing(id, allowCreate) {
  const opened = await openPool(drawingLocation(id), "/drawing.sqlite", allowCreate);
  try {
    const document = await drawingDatabase(
      opened.connection,
      opened.fresh,
      crypto.randomUUID(),
      id,
    );
    await document.load(); // Validate the complete durable chain before catalog publication.
    return document.identity.incarnation;
  } finally {
    await opened.close();
  }
}
async function initializeCatalog(locale) {
  const found = await directories(),
    recoveryErrors = [];
  if (!found.catalog && found.managed) throw Error("storage-catalog-missing");
  if (!found.catalog && found.legacy) {
    await targetLock("drawing", async () => {
      const incarnation = await validateDrawing("drawing", false);
      await withCatalog(true, () => {});
      await reserveDrawing("drawing", locale);
      await publishDrawing("drawing", incarnation);
    });
  } else if (!found.catalog) await withCatalog(true, () => {});
  // Reconcile a crash between catalog creation and legacy publication without moving its files.
  if (found.legacy && !(await catalogExists("drawing"))) {
    try {
      await targetLock("drawing", async () => {
        const incarnation = await validateDrawing("drawing", false);
        await reserveDrawing("drawing", locale);
        await publishDrawing("drawing", incarnation);
      });
    } catch (error) {
      recoveryErrors.push({ id: "drawing", reason: safeError(error) });
    }
  }
  return recoveryErrors;
}
async function completeCreation(id, locale, existingOnly = false) {
  return targetLock(id, async () => {
    const entry = existingOnly ? await catalogGet(id) : await reserveDrawing(id, locale);
    if (!entry) throw Error("storage-missing");
    if (entry.state === "ready") return entry;
    const incarnation = await validateDrawing(id, id !== "drawing");
    return publishDrawing(id, incarnation);
  });
}
async function libraryCommand(message) {
  const locale = message.locale === "uk" ? "uk" : "en";
  const recoveryErrors = await initializeCatalog(locale);
  if (["library-rename", "library-remove", "library-undo"].includes(message.kind))
    return catalogAction(message);
  if (message.kind === "library-create") {
    if (message.document === "drawing") throw Error("storage-document");
    return completeCreation(message.document, locale);
  }
  if (message.kind === "library-get") {
    const blocked = recoveryErrors.find((entry) => entry.id === message.document);
    if (blocked) throw Error(blocked.reason);
    const entry = await catalogGet(message.document);
    return entry?.state === "pending" ? completeCreation(entry.id, locale, true) : entry;
  }
  if (message.kind !== "library-list") throw Error("storage-command");
  const offset = message.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0) throw Error("storage-range");
  // A bounded pending page is reconciled before listing; pending rows are never presented as saved.
  const pending = await withCatalog(false, (sql) =>
    sql(catalogSql.pending, [catalogLimits.pageSize, 0]).map(catalogEntry),
  );
  for (const entry of pending) {
    try {
      await completeCreation(entry.id, locale, true);
    } catch (error) {
      recoveryErrors.push({ id: entry.id, reason: safeError(error) });
    }
  }
  const rows = await withCatalog(false, (sql) =>
    sql(catalogSql.list, [catalogLimits.pageSize + 1, offset]).map(catalogEntry),
  );
  const more = rows.length > catalogLimits.pageSize;
  return {
    drawings: rows.slice(0, catalogLimits.pageSize),
    nextOffset: more ? offset + catalogLimits.pageSize : null,
    pendingRecovery: pending.length === catalogLimits.pageSize,
    recoveryErrors,
  };
}
globalThis.libraryCommand = libraryCommand;
