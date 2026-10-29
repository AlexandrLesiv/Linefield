// Read-only consumer of an isolated shared Wasm arena or transferred snapshot bytes.
// This is transport validation, not SQLite durability or an editable document.
let arena, epoch, control;
self.onmessage = ({ data }) => {
  if (data.kind === "init") {
    arena = data.arena;
    epoch = data.epoch;
    control = data.control;
    self.postMessage({ kind: "ready", epoch });
    return;
  }
  if (data.fault === "stall") return;
  if (data.fault === "throw") throw Error("injected worker failure");
  const { id, offset, length, generation } = data;
  const buffer = data.buffer || arena;
  if (
    (control && Atomics.load(control, 0) !== id) ||
    generation !== epoch ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(length) ||
    length <= 0 ||
    length > 1048560 ||
    offset % 40 ||
    length % 40 ||
    !buffer ||
    offset + length > buffer.byteLength
  ) {
    self.postMessage({ kind: "rejected", id, generation });
    return;
  }
  const start = performance.now();
  let hash = 2166136261;
  const words = new Uint32Array(buffer, offset, length / 4);
  for (let i = 0; i < words.length; i++) hash = Math.imul(hash ^ words[i], 16777619) >>> 0;
  self.postMessage({ kind: "read", id, generation, hash, workerMs: performance.now() - start });
};
