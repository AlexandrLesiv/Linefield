// Read-only pre-migration canonical validation using the shared unpublished Rust decoder.
async function validateLegacyModel(sql, rows) {
  if (!rows.length) return;
  const core = await storageCodec(),
    token = core.restore_begin();
  if (!token) throw Error("storage-codec");
  let work = 0;
  const feed = async (operation, stream, offset, size) => {
    for (let at = 0; at < size; at += 65520) {
      const bytes = sql(storageSql.legacyPart, [
        offset + at + 1,
        Math.min(65520, size - at),
        operation,
      ])[0][0];
      if (!(bytes instanceof Uint8Array) || bytes.length !== Math.min(65520, size - at))
        throw Error("storage-corrupt");
      new Uint8Array(core.memory.buffer, core.restore_input_ptr(), bytes.length).set(bytes);
      if (core.restore_append(token, stream, bytes.length) !== 1) throw Error("storage-corrupt");
      if (++work % 64 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
    }
  };
  try {
    for (const [operation, base, result] of rows) {
      const countBytes = sql(storageSql.legacyCount, [operation])[0][0];
      const count = new DataView(countBytes.buffer, countBytes.byteOffset, 4).getUint32(0, true);
      if (core.restore_batch_begin(token, count, BigInt(base), BigInt(result)) !== 1)
        throw Error("storage-corrupt");
      let offset = 4,
        metadata = 0;
      for (let stream = 0; stream < count; stream++) {
        const word = sql(storageSql.legacyLength, [offset + 1, operation])[0][0];
        const size = new DataView(word.buffer, word.byteOffset, 4).getUint32(0, true);
        offset += 4;
        if (stream === 0) metadata = size;
        await feed(operation, stream, offset, size);
        offset += size;
      }
      if (core.restore_metadata_replay(token) !== 1) throw Error("storage-corrupt");
      await feed(operation, 0, 8, metadata);
      if (core.restore_batch_end(token) !== 1) throw Error("storage-corrupt");
    }
  } finally {
    core.restore_cancel(token);
    while (core.restore_cleanup(token, 64) === 1)
      await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
globalThis.validateLegacyModel = validateLegacyModel;
