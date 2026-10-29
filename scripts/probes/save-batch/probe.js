import { checks } from "./checks.js";
import { limits } from "./limits.js";
import { ink } from "./fixture.js";
const module = await WebAssembly.compileStreaming(fetch("/engine.wasm"));
const load = async () => (await WebAssembly.instantiate(module)).exports;
window.checkpoint = {
  checks: () => checks(load),
  limits: () => limits(load),
  async measure(count) {
    const e = await load(),
      fixtureStart = performance.now();
    ink(e, count);
    const fixtureMs = performance.now() - fixtureStart;
    const start = performance.now(),
      token = e.save_capture(),
      captureMs = performance.now() - start;
    if (!token) throw Error("capture rejected");
    // N+1 is a real completed Rust edit while N retains its source.
    ink(e, 2, 50);
    const worker = new Worker("/worker.js"),
      chunks = [];
    let totalBytes = 0;
    try {
      for (let stream = 0; stream < e.save_stream_count(token); stream++) {
        for (let index = 0; ; index++) {
          const encodeStart = performance.now(),
            size = e.save_chunk(token, stream, index) >>> 0;
          const encodeMs = performance.now() - encodeStart;
          if (size === 0xffffffff) throw Error("invalid chunk");
          const copyStart = performance.now();
          const buffer = new Uint8Array(e.memory.buffer, e.save_chunk_ptr(), size).slice().buffer;
          const copyMs = performance.now() - copyStart;
          let expected = 2166136261;
          for (const byte of new Uint8Array(buffer))
            expected = Math.imul(expected ^ byte, 16777619) >>> 0;
          const transferStart = performance.now();
          const result = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(Error("worker timeout")), 5000);
            worker.onmessage = ({ data }) => {
              clearTimeout(timer);
              resolve(data);
            };
            worker.onerror = reject;
            worker.postMessage({ buffer }, [buffer]);
          });
          if (buffer.byteLength !== 0 || result.hash !== expected || result.length !== size)
            throw Error("transfer mismatch");
          chunks.push({
            stream,
            index,
            size,
            encodeMs,
            copyMs,
            roundtripMs: performance.now() - transferStart,
          });
          totalBytes += size;
          if (size < 65520) break;
        }
      }
      return {
        count,
        fixtureMs,
        captureMs,
        totalBytes,
        wasmBytes: e.memory.buffer.byteLength,
        chunks,
      };
    } finally {
      worker.terminate();
      e.save_release(token);
    }
  },
};
