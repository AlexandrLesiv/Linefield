function chunkStore(sql, context, head) {
  installChunkSchema(sql);
  const reader = chunkReader(sql);
  let protectedStorage = "",
    activeStorage = "";
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
  const checkpoint = () => {
    const row = sql(storageSql.checkpointHead)[0];
    if (!row) return undefined;
    const sequence = sql(storageSql.checkpointSequence, [row[0]])[0]?.[0];
    if (
      !validId(row[0]) ||
      !validId(row[2]) ||
      !Number.isSafeInteger(row[1]) ||
      row[1] < 0 ||
      !Number.isSafeInteger(sequence) ||
      row[1] >= sequence
    )
      throw Error("storage-corrupt");
    return { operation: row[0], cutoff: row[1], epoch: row[2] };
  };
  const manifest = () => {
    checkpoint();
    const batches = sql(storageSql.manifest).map(reader.descriptor);
    let revision = "0";
    for (const b of batches) {
      if (
        !validId(b.operation) ||
        !validRevision(b.result) ||
        b.base !== revision ||
        BigInt(b.result) <= BigInt(revision) ||
        !/^[a-f0-9]{64}$/.test(b.digest)
      )
        throw Error("storage-corrupt");
      revision = b.result;
    }
    if (revision !== head()) throw Error("storage-corrupt");
    return { revision, batches };
  };
  return {
    read: reader.read,
    manifest,
    epoch(grant, reopen = false) {
      if (!validId(grant)) throw Error("storage-identity");
      const old = sql(storageSql.epoch)[0];
      if (reopen && old?.[0] !== grant) throw Error("storage-conflict");
      if (!reopen && old?.[0] !== grant) sql(storageSql.epochSet, [grant, head()]);
      const [epoch, baseline] = sql(storageSql.epoch)[0];
      if (!validId(epoch) || !validRevision(baseline) || BigInt(baseline) > BigInt(head()))
        throw Error("storage-corrupt");
      return { epoch, baseline };
    },
    put(storage, parts) {
      transaction(() => {
        sql(storageSql.queueStorage, [storage]);
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
          sql(storageSql.publishBatch, [
            m.operation,
            m.base,
            m.result,
            m.digest,
            storage,
            streams,
            bytes,
          ]);
          sql(storageSql.insertReceipt, [m.operation, m.base, m.result, m.digest]);
          sql(storageSql.keepStorage, [storage]);
          sql(storageSql.updateHead, [m.result]);
        }
        return { ...m, outcome: "committed" };
      });
    },
    maintenancePlan() {
      const cp = checkpoint(),
        [tail] = sql(storageSql.maintenanceStatus)[0];
      const [epoch, baseline] = sql(storageSql.epoch)[0];
      return {
        tail,
        checkpoint: cp?.operation,
        checkpointEpoch: cp?.epoch,
        epoch,
        baseline,
        cutoff: sql(storageSql.lastSequence)[0][0],
        ...manifest(),
      };
    },
    protect(storage) {
      protectedStorage = storage;
    },
    protectActive(storage) {
      activeStorage = storage;
    },
    publishCheckpoint(m, storage, streams, bytes, plan) {
      return transaction(() => {
        const old = checkpoint(),
          epoch = sql(storageSql.epoch)[0]?.[0];
        if (
          !validId(m.operation) ||
          m.result !== plan.revision ||
          !Number.isSafeInteger(plan.cutoff) ||
          plan.cutoff < 0 ||
          epoch !== plan.epoch ||
          old?.operation !== plan.checkpoint ||
          !validRevision(m.result) ||
          BigInt(m.result) > BigInt(head())
        )
          throw Error("storage-conflict");
        sql(storageSql.publishBatch, [
          m.operation,
          "0",
          m.result,
          m.digest,
          storage,
          streams,
          bytes,
        ]);
        sql(storageSql.checkpointSet, [m.operation, plan.cutoff, epoch]);
        sql(storageSql.keepStorage, [storage]);
        checkpoint();
      });
    },
    receiptCount() {
      return sql(storageSql.receiptCount)[0][0];
    },
    cleanup() {
      checkpoint();
      return transaction(() => {
        sql(storageSql.queueBatches);
        sql(storageSql.gcBatches);
        let work = sql(storageSql.changes)[0][0];
        const storage = sql(storageSql.garbage, [protectedStorage, activeStorage])[0]?.[0];
        if (storage) {
          if (sql(storageSql.referencedStorage, [storage]).length) throw Error("storage-corrupt");
          sql(storageSql.cleanup, [storage]);
          const count = sql(storageSql.changes)[0][0];
          work += count || 1;
          if (!count) sql(storageSql.keepStorage, [storage]);
        }
        return work;
      });
    },
  };
}
globalThis.chunkStore = chunkStore;
