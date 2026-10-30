// Mutation retries prove their original operation, then return the current catalog projection.
async function catalogAction(message) {
  const { kind, document, incarnation, operation } = message;
  if (
    !drawingId(document) ||
    !validId(incarnation) ||
    !drawingId(operation) ||
    operation === "drawing"
  )
    throw Error("storage-identity");
  const expected =
    kind === "library-rename"
      ? message.expectedTitle
      : kind === "library-undo"
        ? message.deletionToken
        : "";
  const value =
    kind === "library-rename" ? message.title : kind === "library-remove" ? operation : "";
  if (typeof expected !== "string" || typeof value !== "string") throw Error("storage-identity");
  if (kind === "library-rename") {
    const core = await storageCodec(),
      bytes = new TextEncoder().encode(value);
    if (bytes.length > catalogLimits.titleBytes || new TextDecoder().decode(bytes) !== value)
      throw Error("storage-title");
    new Uint8Array(core.memory.buffer, core.catalog_title_input_ptr(), bytes.length).set(bytes);
    if (core.catalog_title_valid(bytes.length) !== 1) throw Error("storage-title");
  } else if (kind === "library-undo" && (!drawingId(expected) || expected === "drawing"))
    throw Error("storage-identity");
  const mutate = () =>
    withCatalog(false, (sql) => {
      sql("BEGIN IMMEDIATE");
      try {
        let entry = catalogEntry(sql(catalogSql.rawGet, [document])[0]);
        if (!entry || entry.state !== "ready" || entry.incarnation !== incarnation)
          throw Error("storage-conflict");
        let removed = sql(catalogSql.tombstone, [document])[0];
        if (
          removed &&
          (removed[0] !== incarnation ||
            !drawingId(removed[1]) ||
            !Number.isSafeInteger(removed[2]))
        )
          throw Error("storage-catalog-corrupt");
        const receipt = sql(catalogSql.receipt, [operation])[0],
          identity = [kind, document, incarnation, expected, value];
        if (receipt) {
          if (
            receipt.length !== identity.length ||
            receipt.some((field, index) => typeof field !== "string" || field !== identity[index])
          )
            throw Error("storage-conflict");
        } else {
          if (kind === "library-rename") {
            if (removed) throw Error("storage-deleted");
            if (entry.title !== expected) throw Error("storage-conflict");
            if (value !== entry.title)
              sql(catalogSql.rename, [value, document, incarnation, expected]);
          } else if (kind === "library-remove") {
            if (removed) throw Error("storage-conflict");
            const deleted = Date.now();
            if (
              !Number.isSafeInteger(deleted) ||
              deleted < 0 ||
              deleted > catalogLimits.timestampMax
            )
              throw Error("storage-range");
            sql(catalogSql.remove, [document, incarnation, operation, deleted]);
          } else if (kind === "library-undo") {
            if (!removed || removed[1] !== expected) throw Error("storage-conflict");
            sql(catalogSql.undo, [document, incarnation, expected]);
          } else throw Error("storage-command");
          sql(catalogSql.insertReceipt, [operation, ...identity]);
        }
        entry = catalogEntry(sql(catalogSql.rawGet, [document])[0]);
        removed = sql(catalogSql.tombstone, [document])[0];
        sql("COMMIT");
        return { entry, deletionToken: removed?.[1] ?? null };
      } catch (error) {
        sql("ROLLBACK");
        throw error;
      }
    });
  return kind === "library-rename" ? mutate() : targetLock(document, mutate);
}
globalThis.catalogAction = catalogAction;
