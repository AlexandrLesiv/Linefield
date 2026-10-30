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
  return {
    identity,
    stageAsset: (
      blob: Blob,
      metadata: { mime: number; width: number; height: number; version: number },
    ) =>
      client.call<{
        digest: string;
        mime: number;
        width: number;
        height: number;
        bytes: number;
        version: number;
      }>("asset-stage", { blob, metadata }),
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
      return client.call<Receipt>("commit");
    },
    async read(operation: string, stream: number, chunk: number) {
      return client.call<{ bytes: Uint8Array<ArrayBuffer>; length: number; last: boolean }>(
        "read",
        { operation, stream, chunk },
      );
    },
    async maintain() {
      return client.call<{ pending: boolean; phase: string }>("maintain");
    },
    async maintenanceStatus() {
      return client.call("maintenance-status");
    },
    async load() {
      return client.call<Loaded>("load");
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
