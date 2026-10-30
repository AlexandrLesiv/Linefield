import { ownedAssets } from "./owned-assets";
import { storageClient } from "./client";
import type { Identity, Loaded, Context, Part, Receipt } from "./types";
export async function storage(document: string) {
  let client = storageClient();
  const grant = crypto.randomUUID();
  let identity: Identity;
  const open = async (reopen = false) => client.call<Identity>("open", { grant, document, reopen });
  try {
    identity = await open();
  } catch (error) {
    client.terminate();
    throw error;
  }
  let expected: Context | undefined;
  const assets = ownedAssets(document, (kind, fields) => client.call(kind, fields));
  return {
    identity,
    durable: assets.durable,
    ...assets.api,
    verifyAssets: (references: import("./image-references").AssetReference[]) =>
      client.call("asset-verify", { references }),
    readAsset: (digest: string) =>
      client.call<{
        blob: Blob;
        digest: string;
        mime: number;
        width: number;
        height: number;
        bytes: number;
        version: number;
      }>("asset-read", { digest }),
    async begin(context: Context, streams: number) {
      if (
        Object.keys(identity).some(
          (key) => context[key as keyof Identity] !== identity[key as keyof Identity],
        )
      )
        throw Error("save-identity");
      expected = context;
      await client.call("begin", { context, streams });
    },
    async parts(parts: Part[]) {
      await client.call(
        "parts",
        { parts },
        parts.map((part) => part.bytes.buffer),
      );
    },
    async commit() {
      let seal: Receipt | { pending: true };
      do {
        seal = await client.call<Receipt | { pending: true }>("seal");
      } while ("pending" in seal);
      if (
        !expected ||
        Object.keys(expected).some(
          (key) => seal[key as keyof Context] !== expected![key as keyof Context],
        )
      )
        throw Error("save-seal");
      const receipt = await client.call<Receipt>("commit");
      return receipt;
    },
    async read(operation: string, stream: number, chunk: number) {
      return client.call<{ bytes: Uint8Array<ArrayBuffer>; length: number; last: boolean }>(
        "read",
        { operation, stream, chunk },
      );
    },
    maintainAssets: (revision: string) =>
      client.call<{ pending: boolean; phase: string; retryAfterMs?: number }>("asset-maintain", {
        revision,
      }),
    async maintain() {
      return client.call<{ pending: boolean; phase: string }>("maintain");
    },
    async maintenanceStatus() {
      return {
        ...(await client.call<Record<string, unknown>>("maintenance-status")),
        owners: assets.status(),
      };
    },
    async load() {
      const loaded = await client.call<Loaded>("load");
      return loaded;
    },
    async recover() {
      client.terminate();
      // Reopening is admitted only once the old worker's real Web Lock is released.
      client = storageClient();
      const next = await open(true);
      if (
        Object.keys(identity).some(
          (key) => next[key as keyof Identity] !== identity[key as keyof Identity],
        )
      ) {
        client.terminate();
        throw Error("save-identity");
      }
      await assets.retry();
    },
    async close() {
      try {
        await client.call("close");
      } finally {
        client.terminate();
      }
    },
    terminate: () => client.terminate(),
  };
}
export type Storage = Awaited<ReturnType<typeof storage>>;
