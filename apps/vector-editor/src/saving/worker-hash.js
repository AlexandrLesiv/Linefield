let hashCore;
async function storageCodec() {
  if (!hashCore) {
    const response = await fetch("/vector-editor/core.wasm");
    if (!response.ok) throw Error("storage-codec");
    const { instance } = await WebAssembly.instantiateStreaming(response, {});
    const core = instance.exports;
    if (
      !(core.memory instanceof WebAssembly.Memory) ||
      storageHashFingerprint.some((word, i) => core.save_boundary_fingerprint(i) >>> 0 !== word) ||
      Object.entries(storageHashArity).some(
        ([name, arity]) => typeof core[name] !== "function" || core[name].length !== arity,
      )
    )
      throw Error("storage-codec");
    hashCore = core;
  }
  return hashCore;
}
async function storageHasher() {
  const core = await storageCodec();
  core.storage_hash_begin();
  return {
    append(bytes) {
      if (!(bytes instanceof Uint8Array) || bytes.length > 65520) throw Error("storage-codec");
      new Uint8Array(core.memory.buffer, core.storage_hash_input_ptr(), bytes.length).set(bytes);
      if (core.storage_hash_append(bytes.length) !== 1) throw Error("storage-codec");
    },
    finish() {
      const ptr = core.storage_hash_finish();
      if (!ptr) throw Error("storage-codec");
      return Array.from(new Uint8Array(core.memory.buffer, ptr, 32), (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
    },
  };
}
function hashWord(hash, value) {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) throw Error("storage-range");
  const word = new Uint8Array(4);
  new DataView(word.buffer).setUint32(0, value, true);
  hash.append(word);
}
globalThis.storageHasher = storageHasher;
globalThis.hashWord = hashWord;

globalThis.storageCodec = storageCodec;
