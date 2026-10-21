import init from "#memory-bindings";
import { bridge } from "./bridge.ts";
let engine: ReturnType<typeof init> | undefined;
let memory: WebAssembly.Memory | undefined;
export const wasmBytes = () => memory?.buffer.byteLength ?? 0;
export async function loadEngine() {
  engine ??= init().catch((error: unknown) => {
    engine = undefined;
    throw error;
  });
  const module = await engine;
  memory = module.memory;
  return { bridge, bytes: () => module.memory.buffer.byteLength };
}
