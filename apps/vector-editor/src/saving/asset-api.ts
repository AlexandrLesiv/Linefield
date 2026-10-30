import type { Storage } from "./adapter";
export function assetApi(
  store: Storage,
  run: <T>(call: () => Promise<T>) => Promise<T>,
  changed: () => void,
) {
  const mutate = <T>(call: () => Promise<T>) =>
    run(async () => {
      try {
        return await call();
      } finally {
        changed();
      }
    });
  return {
    stageAsset: (blob: Blob, metadata: Parameters<Storage["stageAsset"]>[1]) =>
      mutate(() => store.stageAsset(blob, metadata)),
    readAsset: (digest: string) => run(() => store.readAsset(digest)),
    finishAsset: (lease: string, revision: string | null) =>
      mutate(() => store.finishAsset(lease, revision)),
    holdAssets: () => run(() => store.holdAssets()),
    releaseAssets: (lease: string) => mutate(() => store.releaseAssets(lease)),
    maintainAssets: (revision: string) => run(() => store.maintainAssets(revision)),
  };
}
