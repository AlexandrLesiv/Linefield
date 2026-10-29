import { scene, buffers } from "./planner.mjs";
import { queryCore, query, polygon } from "./lasso-query.mjs";
const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
window.lassoExperiment = async (dense, mode) => {
  const { plan, rawSamples } = await scene(dense),
    core = await queryCore();
  const worker = new Worker(new URL("./lasso-worker.mjs", import.meta.url), { type: "module" });
  let sequence = 0,
    pending;
  worker.onmessage = ({ data }) => {
    if (!pending || data.id !== pending.id) return;
    clearTimeout(pending.timer);
    if (data.error) pending.reject(Error(data.error));
    else pending.resolve(data);
    pending = null;
  };
  worker.onerror = () => {
    if (pending) {
      clearTimeout(pending.timer);
      pending.reject(Error("Worker failed"));
      pending = null;
    }
  };
  const request = (data, transfer = []) =>
    new Promise((resolve, reject) => {
      if (pending) {
        reject(Error("Queue must be bounded to one"));
        return;
      }
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending = null;
        reject(Error("Query timeout"));
      }, 10000);
      pending = { id, resolve, reject, timer };
      try {
        worker.postMessage({ ...data, id }, transfer);
      } catch (error) {
        clearTimeout(timer);
        pending = null;
        reject(error);
      }
    });
  try {
    const start = performance.now(),
      copy = structuredClone(plan),
      transfer = buffers(copy);
    const bytes = transfer.reduce((n, b) => n + b.byteLength, 0);
    await request({ plan: copy, revision: 1 }, transfer);
    const install = performance.now() - start;
    const exact = [];
    for (const partial of [false, true])
      for (let i = 0; i < 3; i++) {
        const points = polygon(dense, i),
          ids = query(core, plan, points, partial);
        const answer = await request({ points, partial });
        if (JSON.stringify(answer.ids) !== JSON.stringify(ids)) throw Error("Lasso parity failure");
        exact.push({ partial, hits: ids.length });
      }
    const elapsed = [],
      service = [],
      frames = [];
    let running = true,
      last;
    const tick = (t) => {
      if (last !== undefined) frames.push(t - last);
      last = t;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    for (let i = 0; i < 12; i++) {
      await frame();
      const points = polygon(dense, i),
        t = performance.now();
      if (mode === "main") query(core, plan, points, false);
      else service.push((await request({ points, partial: false })).service);
      elapsed.push(performance.now() - t);
    }
    await frame();
    running = false;
    const obsolete = await request({ points: polygon(dense, 0), partial: false });
    if (obsolete.revision === 2) throw Error("Unexpected revision");
    worker.terminate();
    const fallback = query(core, plan, polygon(dense, 0), false);
    if (JSON.stringify(fallback) !== JSON.stringify(obsolete.ids)) throw Error("Fallback differs");
    return {
      dense,
      mode,
      rawSamples,
      bytes,
      install,
      exact,
      elapsed,
      service,
      frames,
      staleTagDetected: obsolete.revision !== 2,
      fallbackExact: true,
      notes:
        "Derived world-space capsules only; independent Rust query scratch, no worker document. Warm query timing excludes snapshot creation. Stale tag is fixture-only, not production edit publication.",
    };
  } finally {
    worker.terminate();
    if (pending) clearTimeout(pending.timer);
  }
};
