import { textArity, textFingerprint, type TextCore } from "./text-core";
export function checkedTextCore(value: unknown): TextCore {
  if (typeof value !== "object" || value === null) throw Error("text-boundary");
  const exports = value as Record<string, unknown>;
  if (!(exports.memory instanceof WebAssembly.Memory)) throw Error("text-boundary");
  for (const [name, arity] of Object.entries(textArity))
    if (typeof exports[name] !== "function" || exports[name].length !== arity)
      throw Error("text-boundary");
  const core = value as TextCore;
  if (textFingerprint.some((word, i) => core.text_fingerprint_word(i) >>> 0 !== word))
    throw Error("text-boundary");
  return core;
}
