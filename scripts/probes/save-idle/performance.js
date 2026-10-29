import { ink, snapshot } from "/fixture.js";
import { drawing, continuous } from "/input.js";
import { scheduler } from "/scheduler.js";
import { storage } from "/adapter.js";
const summary = (values) => {
  const a = [...values].sort((x, y) => x - y);
  return {
    count: a.length,
    median: a.length ? (a[Math.floor((a.length - 1) / 2)] + a[Math.floor(a.length / 2)]) / 2 : 0,
    p95: a[Math.max(0, Math.ceil(a.length * 0.95) - 1)] || 0,
    max: a.at(-1) || 0,
  };
};
export async function measure(load) {
  const results = [];
  for (const mode of ["baseline", "bounded", "baseline", "bounded", "baseline", "bounded"]) {
    const e = await load();
    for (let i = 0; i < 1000; i++) ink(e, 1, i);
    const setup = performance.now(),
      store = mode === "bounded" ? await storage(`perf${"a".repeat(results.length + 1)}`) : null,
      setupMs = performance.now() - setup;
    const saver = store ? scheduler(e, store) : null,
      input = drawing(e),
      frames = [];
    let frame,
      previous = performance.now();
    const observe = (now) => {
      frames.push(now - previous);
      previous = now;
      frame = requestAnimationFrame(observe);
    };
    frame = requestAnimationFrame(observe);
    const target = e.delta_revision(),
      stream = continuous(input),
      pending = saver?.flush(target);
    const inputResult = await stream;
    await pending;
    cancelAnimationFrame(frame);
    const sampled = snapshot(e);
    for (let i = 0; i < 80; i++) {
      const data = sampled[i + 1001];
      if (data.length !== 120) throw Error("sample count");
      const view = new DataView(data.buffer);
      for (let j = 0; j < 3; j++) {
        const item = input.trace[i * 3 + j];
        if (
          view.getFloat64(j * 40 + 8, true) !== item.x ||
          view.getFloat64(j * 40 + 24, true) !== item.y ||
          view.getFloat32(j * 40 + 32, true) !== Math.fround(item.type === "pen" ? 0.6 : 0.5)
        )
          throw Error("input order");
      }
    }
    if (inputResult.accepted !== 240) throw Error("input lost");
    if (saver && e.delta_durable() !== target) throw Error("wrong saved target");
    const phases = {};
    for (const phase of new Set(saver?.metrics.map((m) => m.phase) || []))
      phases[phase] = summary(saver.metrics.filter((m) => m.phase === phase).map((m) => m.ms));
    results.push({
      mode,
      setupMs,
      input: summary(inputResult.delays),
      frames: summary(frames),
      inputSamples: inputResult.delays,
      frameSamples: frames,
      phaseSamples: saver?.metrics || [],
      samples: 240,
      phases,
    });
    if (store) await store.close();
    input.dispose();
  }
  return results;
}
