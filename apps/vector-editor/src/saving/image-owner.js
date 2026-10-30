// The browser lock is a lifetime capability; missing replies and elapsed time
// never establish that the main-thread consumer has ended.
function imageOwner(sql, document, grant) {
  const name = (lease) => storageSql.assetOwnerLockPrefix + document + ":" + lease;
  const valid = (lease, owner) => {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(lease) ||
      owner !== name(lease)
    )
      throw Error("storage-image-owner");
  };
  return {
    async held(lease, owner) {
      valid(lease, owner);
      if (!navigator.locks) throw Error("storage-image-owner");
      const held = await navigator.locks.request(owner, { ifAvailable: true }, (lock) => !lock);
      if (!held) throw Error("storage-image-owner");
    },
    insert(lease, owner, digest, kind) {
      valid(lease, owner);
      const old = sql(storageSql.assetLeaseLookup, [lease])[0];
      if (old) {
        if (old[0] !== grant || old[1] !== digest || old[2] !== kind || old[4] !== owner)
          throw Error("storage-image-owner");
        return;
      }
      sql(storageSql.insertAssetLease, [lease, grant, digest, kind, owner]);
    },
    finish(lease, revision) {
      const old = sql(storageSql.assetLeaseLookup, [lease])[0];
      if (!old) {
        if (revision === null || BigInt(revision) <= BigInt(sql(storageSql.revision)[0][0])) return;
        throw Error("storage-image-owner");
      }
      if (old[0] !== grant || !["stage", "published"].includes(old[2]))
        throw Error("storage-image-owner");
      if (revision === null) {
        if (old[2] !== "stage") throw Error("storage-image-owner");
        sql(storageSql.releaseAssetLease, [lease, grant]);
      } else if (old[2] === "published") {
        if (old[3] !== revision) throw Error("storage-image-owner");
      } else sql(storageSql.publishAssetLease, [revision, lease, grant]);
    },
    release(lease) {
      const old = sql(storageSql.assetLeaseLookup, [lease])[0];
      if (old && (old[0] !== grant || old[2] !== "export")) throw Error("storage-image-owner");
      sql(storageSql.releaseAssetLease, [lease, grant]);
    },
  };
}
function abandonedOwners(sql, document, grant, check) {
  let cursor = "",
    live = false;
  return {
    reset() {
      cursor = "";
      live = false;
    },
    live: () => live,
    async step(revision) {
      check(revision);
      const row = sql(storageSql.assetLeaseCandidate, [cursor])[0];
      if (!row) return false;
      const [token, ownerGrant, , kind, published, owner] = row;
      if (
        !owner ||
        !navigator.locks ||
        owner !== storageSql.assetOwnerLockPrefix + document + ":" + token
      ) {
        cursor = token;
        return true;
      }
      if (ownerGrant === grant && kind === "published" && BigInt(published) > BigInt(revision)) {
        cursor = token;
        live = true;
        return true;
      }
      await navigator.locks.request(owner, { ifAvailable: true }, (lock) => {
        if (!lock) {
          live = true;
          return;
        }
        sql(storageSql.begin);
        try {
          check(revision);
          sql(storageSql.deleteAbandonedAssetLease, row);
          sql(storageSql.commit);
        } catch (error) {
          sql(storageSql.rollback);
          throw error;
        }
      });
      cursor = token;
      return true;
    },
  };
}
globalThis.imageOwner = imageOwner;
globalThis.abandonedOwners = abandonedOwners;
