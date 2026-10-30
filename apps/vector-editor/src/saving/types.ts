import { saveArity, saveFingerprint } from "./boundary";
import type { SaveCore } from "./boundary";
export type { SaveCore } from "./boundary";
export { saveArity } from "./boundary";
export type Identity = { document: string; incarnation: string; grant: string };
export type Context = Identity & {
  operation: string;
  base: string;
  result: string;
  digest: string;
};
export type Receipt = Context & { digest: string; outcome?: string };
export type Part = { stream: number; bytes: Uint8Array<ArrayBuffer>; last: boolean };
export type Loaded = {
  identity: Identity;
  revision: string;
  batches: {
    operation: string;
    base: string;
    result: string;
    digest: string;
    streams: number;
    bytes: number;
  }[];
};
export type State = {
  phase: "saved" | "pending" | "saving" | "error" | "closed";
  revision: bigint;
  durable: bigint;
  error?: string;
};
export function checkedSaveCore(value: unknown): SaveCore {
  const exports = value as Record<string, unknown>;
  if (!(exports.memory instanceof WebAssembly.Memory)) throw Error("save-boundary");
  for (const [name, arity] of Object.entries(saveArity))
    if (typeof exports[name] !== "function" || exports[name].length !== arity)
      throw Error("save-boundary");
  const core = value as SaveCore;
  if (saveFingerprint.some((word, index) => core.save_boundary_fingerprint(index) >>> 0 !== word))
    throw Error("save-boundary");
  return core;
}

export type SaveWaiter = { promise: Promise<void>; resolve(): void; reject(error: Error): void };
