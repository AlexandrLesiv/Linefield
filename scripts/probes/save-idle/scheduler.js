import { targets } from "/targets.js";
// Host scheduling only. Rust owns batch identity, content and durability.
export function scheduler(engine, storage) {
  let batchingTimer;
  const requests = targets();
  let cleaned = engine.idle_status() & 4 ? 0n : engine.delta_durable();
  const metrics = [],
    phases = [];
  let urgent = false,
    running,
    failure,
    target = 0n,
    activeToken = 0;
  let wake;
  const yieldWork = () =>
    new Promise((resolve) => {
      let done = false;
      const settle = () => {
        if (done) return;
        done = true;
        wake = undefined;
        resolve();
      };
      if (urgent || !globalThis.requestIdleCallback) setTimeout(settle, 0);
      else {
        const id = requestIdleCallback(settle, { timeout: 50 });
        wake = () => {
          cancelIdleCallback(id);
          setTimeout(settle, 0);
        };
      }
    });
  const measured = (phase, call) => {
    const start = performance.now(),
      value = call();
    metrics.push({ phase, ms: performance.now() - start });
    return value;
  };
  async function cleanup() {
    phases.push("cleanup");
    let pending;
    do {
      await yieldWork();
      const start = performance.now();
      let calls = 0;
      do {
        pending = measured("cleanup", () => engine.idle_cleanup(16));
        if (pending === 0xffffffff) throw Error("cleanup failed");
      } while (
        pending &&
        ++calls < 64 &&
        performance.now() - start < 1 &&
        !navigator.scheduling?.isInputPending()
      );
      metrics.push({ phase: "cleanup-task", ms: performance.now() - start });
    } while (pending);
  }
  async function pump() {
    await cleanup();
    cleaned = engine.delta_durable();
    requests.settle(cleaned);
    while (engine.delta_durable() < target) {
      phases.push("prepare");
      const token = activeToken || measured("freeze", () => engine.idle_begin());
      activeToken = token;
      if (!token) throw Error("capture unavailable");
      let status;
      do {
        await yieldWork();
        const start = performance.now();
        let calls = 0;
        do {
          status = measured("prepare", () => engine.idle_step(token, 16));
        } while (
          status === 1 &&
          ++calls < 64 &&
          performance.now() - start < 1 &&
          !navigator.scheduling?.isInputPending()
        );
        metrics.push({ phase: "prepare-task", ms: performance.now() - start });
      } while (status === 1);
      if (status !== 2) throw Error("prepare failed");
      const base = engine.idle_base(token),
        result = engine.idle_target(token);
      phases.push("transfer");
      await storage.begin(token, base, result, engine.idle_stream_count(token));
      let stream = 0,
        chunk = 0;
      const count = engine.idle_stream_count(token);
      while (stream < count) {
        await yieldWork();
        const started = performance.now(),
          parts = [];
        let size = 0;
        do {
          const bytes = measured("encode-copy", () => {
            const n = engine.idle_chunk(token, stream, chunk) >>> 0;
            if (n === 0xffffffff) throw Error("chunk failed");
            return new Uint8Array(engine.memory.buffer, engine.idle_chunk_ptr(), n).slice();
          });
          const last = bytes.length < 65520;
          parts.push({ stream, bytes, last });
          size += bytes.length;
          if (last) {
            stream++;
            chunk = 0;
          } else chunk++;
        } while (
          stream < count &&
          parts.length < 256 &&
          size < 196560 &&
          performance.now() - started < 1 &&
          !navigator.scheduling?.isInputPending()
        );
        metrics.push({ phase: "encode-task", ms: performance.now() - started });
        await storage.parts(parts);
      }
      phases.push("commit");
      await storage.commit(); // Adapter validates complete receipt before this returns.
      if (measured("ack", () => engine.idle_ack(token, base, result)) !== 1)
        throw Error("ack rejected");
      activeToken = 0;
      await cleanup();
      cleaned = engine.delta_durable();
      requests.settle(cleaned);
    }
  }
  function startPump() {
    if (running) return;
    running = pump()
      .catch((error) => {
        failure = error;
        requests.fail(error);
      })
      .finally(() => {
        running = undefined;
        urgent = false;
        if (!failure && requests.size) startPump();
      });
  }
  return {
    metrics,
    phases,
    changed() {
      if (!batchingTimer)
        batchingTimer = setTimeout(() => {
          batchingTimer = undefined;
          this.flush().catch(() => {});
        }, 1000);
    },
    flush(revision = engine.delta_revision(), exit = false) {
      clearTimeout(batchingTimer);
      batchingTimer = undefined;
      target = target > revision ? target : revision;
      urgent ||= exit;
      if (exit) wake?.();
      if (failure) return Promise.reject(failure);
      const promise = requests.request(revision);
      requests.settle(cleaned);
      startPump();
      return promise;
    },
    async retry() {
      await storage.recover();
      failure = undefined;
      return this.flush(target, true);
    },
    get failure() {
      return failure;
    },
  };
}
