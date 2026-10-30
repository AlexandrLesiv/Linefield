// Each proof is local to this exclusive writer and one exact durable HEAD.
function imageGarbage(db, database, document, grant) {
  const sql = (query, bind = []) =>
    db.exec({ sql: query, bind, rowMode: "array", returnValue: "resultRows" });
  let cursor = "";
  let proof,
    ready = false,
    removed = 0,
    bytes = 0;
  const matches = (revision) =>
    sql(storageSql.revision)[0]?.[0] === revision && sql(storageSql.epoch)[0]?.[0] === grant;
  const check = (revision) => {
    if (!validRevision(revision) || !matches(revision)) throw Error("storage-conflict");
  };
  const owners = abandonedOwners(sql, document, grant, check);
  return {
    hasAssets() {
      return (
        sql(storageSql.assetGcCandidate, [document, ""]).length > 0 ||
        sql(storageSql.assetLeaseCandidate, [""]).length > 0
      );
    },
    changed() {
      owners.reset();
      cursor = "";
    },
    begin(revision) {
      owners.reset();
      cursor = "";
      check(revision);
      proof = { id: crypto.randomUUID(), revision };
      ready = false;
    },
    async *collect(core, token, revision) {
      if (!proof || proof.revision !== revision) return;
      for (let index = 0; ; index++) {
        check(revision);
        const state = core.image_restore_asset(token, index);
        if (state === 2) return;
        if (state !== 1 && state !== 3) throw Error("storage-image-boundary");
        if (state === 1) {
          const digest = new TextDecoder().decode(
            new Uint8Array(core.memory.buffer, core.image_asset_digest_ptr(), 64),
          );
          if (!/^[0-9a-f]{64}$/.test(digest)) throw Error("storage-image-boundary");
          sql(storageSql.insertAssetRoot, [proof.id, digest]);
        }
        if (index % 32 === 31) yield;
      }
    },
    check,
    finish(revision) {
      check(revision);
      if (!proof || proof.revision !== revision) throw Error("storage-conflict");
      const plan = database.maintenancePlan();
      if (
        plan.tail !== 0 ||
        (plan.checkpointEpoch !== grant && !(revision === "0" && plan.batches.length === 0))
      )
        throw Error("storage-conflict");
      ready = true;
    },
    pending(revision) {
      return !!proof && proof.revision === revision && ready && matches(revision);
    },
    async step(revision) {
      if (!ready || !proof || proof.revision !== revision) throw Error("storage-conflict");
      if (await owners.step(revision)) return { pending: true, phase: "asset-owners" };
      sql(storageSql.begin);
      try {
        check(revision);
        // Prior grants cannot publish under the exclusive lock. Their global export
        // holds remain conservative because the old main thread may still exist.
        for (const [query, bind] of [
          [storageSql.releaseOldAssetLeases, [grant]],
          [storageSql.releaseSettledLeases, [grant, revision, revision, revision]],
          [storageSql.deleteOldRoots, [proof.id]],
        ]) {
          sql(query, bind);
          if (sql(storageSql.changes)[0][0]) {
            sql(storageSql.commit);
            return { pending: true, phase: "asset-roots" };
          }
        }
        const candidate = sql(storageSql.assetGcCandidate, [document, cursor])[0];
        let deleted = 0;
        if (candidate) {
          if (sql(storageSql.imageAssetExists, [document, candidate[0]]).length !== 1)
            throw Error("storage-image-conflict");
          sql(storageSql.deleteAssetCandidate, [document, candidate[0], proof.id]);
          deleted = sql(storageSql.changes)[0][0];
          sql(storageSql.deleteLargeAssetCandidate, [document, candidate[0], proof.id]);
          deleted += sql(storageSql.changes)[0][0];
          if (deleted > 1) throw Error("storage-image-conflict");
        }
        sql(storageSql.commit);
        if (candidate) {
          cursor = candidate[0];
          if (deleted === 1) {
            removed++;
            bytes += candidate[1];
          }
        }
        const waiting = !candidate && owners.live();
        if (!candidate) {
          cursor = "";
          owners.reset();
        }
        if (waiting) return { pending: true, phase: "asset-owner-wait", retryAfterMs: 1000 };
        return { pending: !!candidate, phase: candidate ? "asset-cleanup" : "idle" };
      } catch (error) {
        sql(storageSql.rollback);
        ready = false;
        throw error;
      }
    },
    status() {
      const [count, retainedBytes] = sql(storageSql.assetGcStatus, [document])[0];
      return {
        count,
        retainedBytes,
        removed,
        reclaimedBytes: bytes,
        proofRevision: ready ? proof?.revision : undefined,
      };
    },
  };
}
globalThis.imageGarbage = imageGarbage;
