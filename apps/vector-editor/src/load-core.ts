import { coreExportArity, coreAbiFingerprint, type Core } from "./core";

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
  const core = exports as unknown as Core;
  if (
    coreAbiFingerprint.some((word, index) => core.boundary_fingerprint_word(index) >>> 0 !== word)
  )
    throw new Error("Drawing engine ABI fingerprint mismatch");
  return core;
}
