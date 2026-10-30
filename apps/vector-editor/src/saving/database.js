// Storage executor only: opaque Rust batches, transactional revision/head and exact retry receipts.
const validId = (s) => typeof s === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(s);
const validRevision = (s) =>
  typeof s === "string" && /^(0|[1-9][0-9]{0,19})$/.test(s) && BigInt(s) <= 18446744073709551615n;
async function drawingDatabase(
  db,
  fresh,
  grant,
  document = "drawing",
  expectedIncarnation,
  reopen = false,
) {
  const sql = (query, bind = []) =>
    db.exec({ sql: query, bind, rowMode: "array", returnValue: "resultRows" });
  if (fresh) {
    sql(storageSql.begin);
    try {
      sql(storageSql.createHead);
      sql(storageSql.createLegacyBatches);
      sql(storageSql.insertHead, [crypto.randomUUID(), "0"]);
      sql(storageSql.versionLegacy);
      sql(storageSql.commit);
    } catch (error) {
      sql(storageSql.rollback);
      throw error;
    }
  }
  const version = sql(storageSql.version)[0]?.[0];
  if (
    version !== 1 &&
    version !== 2 &&
    version !== 3 &&
    version !== 4 &&
    version !== 5 &&
    version !== 6
  )
    throw Error("storage-version");
  if (sql(storageSql.quickCheck)[0]?.[0] !== "ok") throw Error("storage-corrupt");
  validateChunkSchema(sql, version);
  const rows = sql(storageSql.head);
  const h = rows[0];
  if (rows.length !== 1 || !h || !validId(h[0]) || !validRevision(h[1]))
    throw Error("storage-corrupt");
  if (expectedIncarnation !== undefined && expectedIncarnation !== h[0])
    throw Error("storage-conflict");
  const identity = { document, incarnation: h[0], grant };
  const context = (m) => {
    if (
      !m ||
      Object.keys(m).some(
        (k) =>
          !["document", "incarnation", "grant", "operation", "base", "result", "digest"].includes(
            k,
          ),
      ) ||
      Object.keys(identity).some((k) => m[k] !== identity[k]) ||
      !validId(m.operation) ||
      !/^[0-9a-f]{64}$/.test(m.digest) ||
      !validRevision(m.base) ||
      !validRevision(m.result) ||
      BigInt(m.result) <= BigInt(m.base)
    )
      throw Error("storage-identity");
  };
  // Validate source bytes before a transactional schema extension; never rewrite v1 payloads.
  if (version === 1) await validateLegacy(sql);
  if (version === 2) {
    const reader = chunkReader(sql);
    const legacyStore = {
      read: reader.read,
      manifest() {
        const batches = sql(storageSql.allManifest).map(reader.descriptor);
        let revision = "0";
        for (const b of batches) {
          if (
            b.base !== revision ||
            !validRevision(b.result) ||
            BigInt(b.result) <= BigInt(revision)
          )
            throw Error("storage-corrupt");
          revision = b.result;
        }
        if (revision !== h[1]) throw Error("storage-corrupt");
        return { revision, batches };
      },
    };
    await validateChunkModel(legacyStore, await validateChunks(legacyStore));
  }
  const chunks = chunkStore(sql, context, () => sql(storageSql.revision)[0][0]);
  let initial = await validateChunks(chunks);
  chunks.epoch(grant, reopen);
  while (chunks.cleanup() > 0) await new Promise((resolve) => setTimeout(resolve, 0));
  return {
    identity,
    context,
    ...chunks,
    commitChunks(...args) {
      const receipt = chunks.commitChunks(...args);
      initial = undefined;
      return receipt;
    },
    publishCheckpoint(...args) {
      const value = chunks.publishCheckpoint(...args);
      initial = undefined;
      return value;
    },
    async load() {
      const manifest = initial ?? (await validateChunks(chunks));
      initial = undefined;
      return { identity, ...manifest };
    },
  };
}
globalThis.drawingDatabase = drawingDatabase;
