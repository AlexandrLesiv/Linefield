import { coreExportArity, type Core } from "./core";

/** Validate once at startup; never wrap the hot input or rendering calls. */
export async function loadCore(): Promise<Core> {
  const response = await fetch("/vector-editor/core.wasm");
  if (!response.ok) throw new Error(`Drawing engine download failed (${response.status})`);
  const { instance } = await WebAssembly.instantiateStreaming(response, {});
  const exports = instance.exports;
  if (!(exports.memory instanceof WebAssembly.Memory))
    throw new Error("Drawing engine memory is missing");
  for (const [name, arity] of Object.entries(coreExportArity)) {
    const value = exports[name];
    if (typeof value !== "function" || value.length !== arity) {
      throw new Error(`Drawing engine ABI mismatch: ${name}`);
    }
  }
  return exports as unknown as Core;
}
