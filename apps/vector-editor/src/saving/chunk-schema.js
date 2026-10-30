const headSchema = storageSql.createHead;
const batchSchema = storageSql.createLegacyBatches;
const chunksSchema = storageSql.createChunks;
function validateChunkSchema(sql, version) {
  const expected = new Map([
    ["save_head", headSchema],
    [
      "save_batches",
      version === 1
        ? batchSchema
        : batchSchema.slice(0, -1) + ", storage TEXT, streams INTEGER, bytes INTEGER)",
    ],
    ...(version >= 2 ? [["save_chunks", chunksSchema]] : []),
    ...(version === 3
      ? [
          ["save_receipts", storageSql.createReceipts],
          ["save_checkpoint", storageSql.createCheckpoint],
          ["save_epoch", storageSql.createEpoch],
          ["save_garbage", storageSql.createGarbage],
          ["save_batches_storage", storageSql.createStorageIndex],
        ]
      : []),
  ]);
  const rows = sql(storageSql.inspectSchema);
  if (
    rows.length !== expected.size ||
    rows.some(
      ([name, source]) =>
        typeof source !== "string" ||
        source.replace(/\s/g, "") !== expected.get(name)?.replace(/\s/g, ""),
    )
  )
    throw Error("storage-layout");
}
function installChunkSchema(sql) {
  const version = sql(storageSql.version)[0]?.[0];
  if (version === 3) return;
  if (version !== 1 && version !== 2) throw Error("storage-version");
  sql(storageSql.begin);
  try {
    if (version === 1) {
      sql(storageSql.addStorage);
      sql(storageSql.addStreams);
      sql(storageSql.addBytes);
      sql(chunksSchema);
    }
    sql(storageSql.createReceipts);
    sql(storageSql.createCheckpoint);
    sql(storageSql.copyReceipts);
    sql(storageSql.createEpoch);
    sql(storageSql.createGarbage);
    sql(storageSql.createStorageIndex);
    sql(storageSql.discoverGarbage);
    sql(storageSql.versionCheckpoint);
    validateChunkSchema(sql, 3);
    sql(storageSql.commit);
  } catch (error) {
    sql(storageSql.rollback);
    throw error;
  }
}
globalThis.installChunkSchema = installChunkSchema;
globalThis.validateChunkSchema = validateChunkSchema;
