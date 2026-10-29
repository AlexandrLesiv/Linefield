import { scene } from "./planner.mjs";
import { renderer } from "./offscreen-render.mjs";
const frame = () => new Promise((r) => requestAnimationFrame(r));
window.offscreenExperiment = async (mode) => {
  const { plan, rawSamples } = await scene(true),
    records = plan.records.slice(0, 12).map((r) => ({
      id: r.id,
      color: r.color,
      opacity: r.opacity,
      brush: r.brush,
      entry: {
        capsules: r.entry.capsules,
        capsuleStride: r.entry.capsuleStride,
        segments: r.entry.segments,
      },
    }));
  const canvas = document.createElement("canvas");
  canvas.width = 2880;
  canvas.height = 1632;
  canvas.style.width = "1440px";
  canvas.style.height = "816px";
  document.body.append(canvas);
  const worker =
    mode === "worker"
      ? new Worker(new URL("./offscreen-worker.mjs", import.meta.url), { type: "module" })
      : null;
  let sequence = 0,
    pending,
    render;
  if (worker) {
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
        pending.reject(Error("Worker failure"));
        pending = null;
      }
    };
  }
  const request = (data, transfer = []) =>
    new Promise((resolve, reject) => {
      if (pending) {
        reject(Error("Unbounded queue"));
        return;
      }
      const id = ++sequence,
        timer = setTimeout(() => {
          pending = null;
          reject(Error("Offscreen timeout"));
        }, 15000);
      pending = { id, timer, resolve, reject };
      try {
        worker.postMessage({ ...data, id }, transfer);
      } catch (error) {
        clearTimeout(timer);
        pending = null;
        reject(error);
      }
    });
  let running = false;
  try {
    const start = performance.now();
    let bytes,
      transferBytes = 0;
    if (worker) {
      const copy = structuredClone(records),
        buffers = copy.map((r) => r.entry.capsules.buffer);
      transferBytes = buffers.reduce((n, b) => n + b.byteLength, 0);
      const offscreen = canvas.transferControlToOffscreen();
      bytes = (await request({ canvas: offscreen, records: copy }, [offscreen, ...buffers])).bytes;
    } else {
      render = renderer(canvas, records);
      await render.complete();
      bytes = render.bytes();
    }
    const cold = performance.now() - start,
      submission = [],
      completion = [],
      arrival = [],
      frames = [];
    let last;
    running = true;
    const tick = (t) => {
      if (last !== undefined) frames.push(t - last);
      last = t;
      if (running) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    for (let i = 0; i < 24; i++) {
      await frame();
      const t = performance.now();
      if (worker) {
        const result = await request({ frame: i });
        submission.push(result.submission);
        completion.push(result.completion);
      } else {
        render.draw(i);
        submission.push(performance.now() - t);
        await render.complete();
        completion.push(performance.now() - t);
      }
      arrival.push(performance.now() - t);
    }
    await frame();
    running = false;
    const hashes = [];
    let finalBytes;
    for (const i of [0, 9, 18]) {
      let pixels;
      if (worker) {
        const result = await request({ frame: i, read: true });
        pixels = result.pixels;
        finalBytes = result.bytes;
      } else {
        render.draw(i);
        await render.complete();
        pixels = render.pixels();
        finalBytes = render.bytes();
      }
      const digest = await crypto.subtle.digest("SHA-256", pixels);
      hashes.push(
        Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, "0")).join(""),
      );
      if (!pixels.some((n, index) => index % 4 !== 3 && n !== 255)) throw Error("Empty image");
    }
    return {
      mode,
      cold,
      bytes,
      finalBytes,
      renderedRecords: records.length,
      renderedSegments: records.reduce((n, r) => n + r.entry.segments, 0),
      transferBytes,
      submission,
      completion,
      arrival,
      frames,
      hashes,
      rawSamples,
      notes:
        "Twelve derived strokes, three brushes, ordered legacy coverage; actual production GPU modules, no sparse/composite cache. Fence polling is completion proxy, not GPU time. No worker document or production migration.",
    };
  } finally {
    running = false;
    worker?.terminate();
    if (pending) clearTimeout(pending.timer);
    canvas.remove();
  }
};
