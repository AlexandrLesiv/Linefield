import { imageArity, imageFingerprint, type ImageCore } from "./image-core";
export function checkedImageCore(value: unknown): ImageCore {
  if (typeof value !== "object" || value === null) throw Error("image-boundary");
  const exports = value as Record<string, unknown>;
  if (!(exports.memory instanceof WebAssembly.Memory)) throw Error("image-boundary");
  for (const [name, arity] of Object.entries(imageArity))
    if (typeof exports[name] !== "function" || exports[name].length !== arity)
      throw Error("image-boundary");
  const core = value as ImageCore;
  if (imageFingerprint.some((word, i) => core.image_fingerprint_word(i) >>> 0 !== word))
    throw Error("image-boundary");
  return core;
}
