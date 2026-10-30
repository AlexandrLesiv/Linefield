// Bounded storage maintenance. This independent codec never owns the editing document.
function checkpointMaintenance(database, assetsGc) {
  let job,
    phase = "idle",
    codec,
    error;
  async function* run(plan, assetRevision) {
    if (assetRevision !== undefined) assetsGc.begin(assetRevision);
    if (assetRevision === "0" && plan.batches.length === 0) {
      assetsGc.finish(assetRevision);
      return;
    }
    codec ||= await storageCodec(true);
    const core = codec,
      token = core.restore_begin(),
      storage = crypto.randomUUID();
    if (!token) throw Error("storage-replay");
    let published = false;
    database.protect(storage);
    try {
      let revision = "0",
        pruned = plan.checkpointEpoch === plan.epoch;
      const prune = async function* () {
        if (pruned || revision !== plan.baseline) return;
        phase = "prune";
        for (;;) {
          const state = core.restore_prune_sources(token, BigInt(revision), 64);
          if (state !== 1 && state !== 2) throw Error("storage-replay");
          yield;
          if (state === 2) break;
        }
        pruned = true;
      };
      yield* prune();
      for (const batch of plan.batches) {
        phase = "replay";
        if (
          core.restore_batch_begin(
            token,
            batch.streams,
            BigInt(batch.base),
            BigInt(batch.result),
          ) !== 1
        )
          throw Error("storage-replay");
        for (let pass = 0; pass < 2; pass++) {
          if (pass && core.restore_metadata_replay(token) !== 1) throw Error("storage-replay");
          for (let stream = 0; stream < (pass ? 1 : batch.streams); stream++) {
            let chunk = 0,
              last = false;
            while (!last) {
              const part = database.read(batch.operation, stream, chunk++);
              new Uint8Array(core.memory.buffer, core.restore_input_ptr(), part.bytes.length).set(
                part.bytes,
              );
              if (core.restore_append(token, stream, part.bytes.length) !== 1)
                throw Error("storage-replay");
              last = part.last;
              yield;
            }
          }
        }
        if (core.restore_batch_end(token) !== 1) throw Error("storage-replay");
        revision = batch.result;
        yield* prune();
      }
      if (!pruned || revision !== plan.revision) throw Error("storage-replay");
      yield* database.verifyImageModelSteps(core, token);
      if (assetRevision !== undefined) yield* assetsGc.collect(core, token, assetRevision);
      phase = "prepare";
      if (core.restore_checkpoint_begin(token) !== 1) throw Error("storage-replay");
      for (;;) {
        const state = core.restore_checkpoint_step(token, 64);
        if (state !== 1 && state !== 2) throw Error("storage-replay");
        yield;
        if (state === 2) break;
      }
      const streams = core.restore_checkpoint_count(token);
      if (!streams) throw Error("storage-replay");
      let bytes = 4 + streams * 4;
      phase = "write";
      for (let stream = 0; stream < streams; stream++) {
        let chunk = 0,
          last = false;
        while (!last) {
          const size = core.restore_checkpoint_chunk(token, stream, chunk);
          if (size > 65520) throw Error("storage-replay");
          const part = new Uint8Array(
            core.memory.buffer,
            core.restore_checkpoint_ptr(token),
            size,
          ).slice();
          last = size < 65520;
          database.put(storage, [{ stream, chunk: chunk++, last, bytes: part }]);
          bytes += size;
          yield;
        }
      }
      phase = "seal";
      const hash = await storageHasher(core);
      hashWord(hash, streams);
      for (let stream = 0; stream < streams; stream++) {
        hashWord(hash, database.stagedLength(storage, stream));
        let chunk = 0,
          last = false;
        while (!last) {
          const part = database.stagedPart(storage, stream, chunk++);
          hash.append(part.bytes);
          last = part.last;
          yield;
        }
      }
      phase = "publish";
      if (assetRevision !== undefined) assetsGc.check(assetRevision);
      database.publishCheckpoint(
        { operation: crypto.randomUUID(), result: revision, digest: hash.finish() },
        storage,
        streams,
        bytes,
        plan,
      );
      published = true;
      yield;
    } finally {
      phase = "retire";
      core.restore_cancel(token);
      while (core.restore_cleanup(token, 64) === 1) yield;
      database.protect("");
      phase = published ? "cleanup" : "abandon";
      while (database.cleanup() > 0) yield;
      if (published && assetRevision !== undefined) assetsGc.finish(assetRevision);
    }
  }
  return {
    status() {
      const plan = database.maintenancePlan();
      return {
        tail: plan.tail,
        receipts: database.receiptCount(),
        checkpoint: plan.checkpoint,
        epoch: plan.epoch,
        baseline: plan.baseline,
        phase,
        error,
        assets: assetsGc.status(),
      };
    },
    async step(assetRevision) {
      if (assetRevision !== undefined && !assetsGc.hasAssets()) assetRevision = undefined;
      if (assetRevision !== undefined && !job && assetsGc.pending(assetRevision))
        return assetsGc.step(assetRevision);
      if (!job) {
        const plan = database.maintenancePlan();
        if (assetRevision !== undefined && plan.revision !== assetRevision)
          throw Error("storage-conflict");
        if (assetRevision === undefined && plan.tail < 128)
          return { pending: false, phase: "idle" };
        error = undefined;
        job = run(plan, assetRevision);
      }
      try {
        const result = await job.next();
        if (result.done) {
          job = undefined;
          phase = "idle";
        }
        return {
          pending: !result.done || assetRevision !== undefined,
          phase,
        };
      } catch (cause) {
        job = undefined;
        phase = "failed";
        error = cause?.message ?? "storage-failed";
        throw cause;
      }
    },
  };
}
globalThis.checkpointMaintenance = checkpointMaintenance;
