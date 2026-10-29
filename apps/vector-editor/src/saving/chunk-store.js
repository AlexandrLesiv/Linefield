function chunkStore(sql, context, head) {
  installChunkSchema(sql);
  const reader = chunkReader(sql);
  const capacity = (extra) => {
    const [count, bytes] = sql(storageSql.capacity)[0];
    if (count > 10000 || (extra > 0 && count >= 10000) || bytes + extra > 48 * 1024 * 1024)
      throw Error("storage-capacity");
  };
  const transaction = (action) => {
    sql(storageSql.begin);
    try {
      const value = action();
      sql(storageSql.commit);
      return value;
    } catch (error) {
      sql(storageSql.rollback);
      throw error;
    }
  };
  return {
    read: reader.read,
    manifest() {
      capacity(0);
      const batches = sql(storageSql.manifest).map(reader.descriptor);
      let revision = "0";
      for (const batch of batches) {
        if (
          !validId(batch.operation) ||
          !validRevision(batch.result) ||
          batch.base !== revision ||
          BigInt(batch.result) <= BigInt(revision) ||
          !/^[a-f0-9]{64}$/.test(batch.digest)
        )
          throw Error("storage-corrupt");
        revision = batch.result;
      }
      if (revision !== head()) throw Error("storage-corrupt");
      return { revision, batches };
    },
    put(storage, parts) {
      transaction(() => {
        for (const p of parts)
          sql(storageSql.insertChunk, [storage, p.stream, p.chunk, p.last ? 1 : 0, p.bytes]);
      });
    },
    stagedLength(storage, stream) {
      return sql(storageSql.streamLength, [storage, stream])[0][0];
    },
    stagedPart(storage, stream, chunk) {
      const row = sql(storageSql.chunk, [storage, stream, chunk])[0];
      if (!row || !(row[0] instanceof Uint8Array)) throw Error("storage-corrupt");
      return { bytes: row[0].slice(), last: row[1] === 1 };
    },
    commitChunks(m, storage, streams, bytes) {
      context(m);
      return transaction(() => {
        const old = sql(storageSql.receipt, [m.operation])[0];
        if (old) {
          if (old[0] !== m.base || old[1] !== m.result || old[2] !== m.digest)
            throw Error("storage-conflict");
        } else {
          if (head() !== m.base) throw Error("storage-conflict");
          capacity(bytes);
          sql(storageSql.publishBatch, [
            m.operation,
            m.base,
            m.result,
            m.digest,
            storage,
            streams,
            bytes,
          ]);
          sql(storageSql.updateHead, [m.result]);
        }
        return { ...m, outcome: "committed" };
      });
    },
    cleanup() {
      sql(storageSql.cleanup);
      return sql(storageSql.changes)[0][0];
    },
  };
}
globalThis.chunkStore = chunkStore;
