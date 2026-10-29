export const STRIDE = 40,
  CHUNK = 1048560,
  MAX = 40_000_000;
export const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
export function source(count, shared) {
  const size = count * STRIDE;
  if (!Number.isSafeInteger(size) || size < STRIDE || size > MAX) throw Error("workload bound");
  const memory = shared
    ? new WebAssembly.Memory({ initial: Math.ceil(size / 65536), maximum: 1024, shared: true })
    : null;
  const buffer = memory ? memory.buffer : new ArrayBuffer(size);
  const view = new DataView(buffer);
  for (let i = 0; i < count; i++) {
    const o = i * STRIDE;
    view.setBigInt64(o, BigInt(i % 17), true);
    view.setFloat64(o + 8, (i % 65536) + 0.125, true);
    view.setBigInt64(o + 16, BigInt(-(i % 13)), true);
    view.setFloat64(o + 24, (i % 32768) + 0.25, true);
    view.setFloat32(o + 32, (i % 101) / 100, true);
    view.setUint32(o + 36, 0, true);
  }
  return { buffer, size };
}
export function checksum(buffer, offset, length) {
  let total = 0;
  for (let start = offset; start < offset + length; start += CHUNK) {
    let hash = 2166136261;
    for (const word of new Uint32Array(buffer, start, Math.min(CHUNK, offset + length - start) / 4))
      hash = Math.imul(hash ^ word, 16777619) >>> 0;
    total = (total + hash) >>> 0;
  }
  return total;
}
export async function consumer(arena, epoch = 1, url = "./worker.js") {
  const worker = new Worker(url, { type: "module" });
  let sequence = 0,
    retired = false;
  const control = arena ? new Int32Array(new SharedArrayBuffer(4)) : undefined;
  const pending = new Map();
  function stop() {
    retired = true;
    worker.terminate();
    for (const waiter of pending.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(Error("worker-retired"));
    }
    pending.clear();
  }
  worker.onerror = (event) => {
    event.preventDefault();
    stop();
  };
  worker.onmessageerror = stop;
  worker.onmessage = ({ data }) => {
    const key = data.id ?? "ready",
      waiter = pending.get(key);
    if (!waiter) return;
    clearTimeout(waiter.timer);
    pending.delete(key);
    waiter.resolve(data);
  };
  function send(key, body, transfer = []) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(stop, 5000);
      pending.set(key, { resolve, reject, timer });
      try {
        worker.postMessage(body, transfer);
      } catch (error) {
        clearTimeout(timer);
        pending.delete(key);
        reject(error);
      }
    });
  }
  try {
    await send("ready", { kind: "init", arena, epoch, control });
  } catch (error) {
    stop();
    throw error;
  }
  return {
    request(body, transfer = []) {
      if (retired) throw Error("retired");
      if (pending.size) throw Error("capacity");
      const id = ++sequence;
      if (control) Atomics.store(control, 0, id);
      return send(id, { ...body, id }, transfer);
    },
    stop,
  };
}
