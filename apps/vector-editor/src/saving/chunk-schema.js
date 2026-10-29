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
    ...(version === 2 ? [["save_chunks", chunksSchema]] : []),
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
  if (version === 2) return;
  if (version !== 1) throw Error("storage-version");
  sql(storageSql.begin);
  try {
    sql(storageSql.addStorage);
    sql(storageSql.addStreams);
    sql(storageSql.addBytes);
    sql(chunksSchema);
    sql(storageSql.versionChunks);
    validateChunkSchema(sql, 2);
    sql(storageSql.commit);
  } catch (error) {
    sql(storageSql.rollback);
    throw error;
  }
}
globalThis.installChunkSchema = installChunkSchema;
globalThis.validateChunkSchema = validateChunkSchema;
