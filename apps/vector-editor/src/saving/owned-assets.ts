import { assetOwnerLockPrefix } from "./asset-owner-contract";
type Call = <T>(kind: string, fields?: Record<string, unknown>) => Promise<T>;
type Metadata = { mime: number; width: number; height: number; version: number };
type Asset = Metadata & { digest: string; bytes: number; lease: string };
/** Main-thread lifetime capability. Worker shutdown does not release live consumers. */
export function ownedAssets(document: string, call: Call) {
  let durable = 0n;
  const owners = new Map<string, { release(): void; revision?: string; settled?: boolean }>();
  const release = (lease: string) => {
    owners.get(lease)?.release();
    owners.delete(lease);
  };
  async function acquire() {
    if (!navigator.locks || owners.size >= 64) throw Error("storage-image-owner-capacity");
    const lease = crypto.randomUUID(),
      owner = `${assetOwnerLockPrefix}${document}:${lease}`;
    await new Promise<void>((resolve, reject) => {
      void navigator.locks
        .request(owner, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            reject(Error("storage-image-owner-conflict"));
            return;
          }
          await new Promise<void>((done) => {
            owners.set(lease, { release: done });
            resolve();
          });
        })
        .catch(reject);
    });
    return { lease, owner };
  }
  async function finishAsset(lease: string, revision: string | null) {
    const entry = owners.get(lease);
    if (!entry) throw Error("storage-image-owner-missing");
    if (revision !== null) entry.revision = revision;
    try {
      await call("asset-finish", { lease, revision });
      entry.settled = true;
      if (revision !== null && BigInt(revision) <= durable) release(lease);
    } finally {
      if (revision === null) release(lease);
    }
  }
  return {
    api: {
      async stageAsset(blob: Blob, metadata: Metadata) {
        const owned = await acquire();
        try {
          const result = await call<Asset>("asset-stage", { blob, metadata, ...owned });
          if (result.lease !== owned.lease) throw Error("storage-image-owner-conflict");
          return result;
        } catch (error) {
          release(owned.lease);
          throw error;
        }
      },
      finishAsset,
      async holdAssets() {
        const owned = await acquire();
        try {
          const lease = await call<string>("asset-hold", owned);
          if (lease !== owned.lease) throw Error("storage-image-owner-conflict");
          return lease;
        } catch (error) {
          release(owned.lease);
          throw error;
        }
      },
      async releaseAssets(lease: string) {
        try {
          await call("asset-release", { lease });
        } finally {
          release(lease);
        }
      },
    },
    async retry() {
      for (const [lease, entry] of owners)
        if (entry.revision !== undefined && !entry.settled)
          await finishAsset(lease, entry.revision);
    },
    durable(revision: string) {
      durable = BigInt(revision);
      for (const [lease, entry] of owners)
        if (entry.revision !== undefined && BigInt(entry.revision) <= BigInt(revision))
          release(lease);
    },
    status: () => ({
      live: owners.size,
      pendingPublication: Array.from(owners.values()).filter(
        (entry) => entry.revision !== undefined,
      ).length,
    }),
  };
}
