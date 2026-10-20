import CanvasKitInit from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import { Cache } from "./cache.ts";
import { Measure } from "./measure.ts";
import { oracle } from "./oracle.ts";
import { render } from "./render.ts";
import type { Request, Result } from "./protocol.ts";
import { gpuReference, warmup } from "../cpu-raster/reference.ts";
const ready = CanvasKitInit({ locateFile: () => canvasWasm });
let retained: Cache | undefined;
let initialized = false;
function heapCapacity(kit: object) {
  const heap: unknown = Reflect.get(kit, "HEAPU8");
  return heap instanceof Uint8Array ? heap.buffer.byteLength : 0;
}
async function run(request: Request): Promise<Result> {
  const start = performance.now();
  const measure = new Measure(request.guarded, (stage, units) =>
    self.postMessage({ kind: "progress", id: request.id, stage, units }),
  );
  measure.enter("initialization");
  const kit = await ready;
  if (!initialized) {
    const paint = new kit.Paint();
    try {
      paint.setAntiAlias(true);
      paint.setColor(kit.BLACK);
      warmup(kit, paint);
    } finally {
      paint.delete();
    }
    initialized = true;
  }
  measure.beginBusy();
  retained ??= new Cache(kit);
  const cache = request.fresh ? new Cache(kit) : retained;
  let bitmap: ImageBitmap | undefined;
  try {
    if (request.initialize)
      return {
        kind: "result",
        id: request.id,
        status: "completed",
        stage: "initialized",
        units: [],
        cursors: [],
        hits: 0,
        builds: 0,
        appendedVerbs: 0,
        handles: cache.handles(),
        heap: heapCapacity(kit),
        uninterruptedBusyMs: [],
        workerWallMs: performance.now() - start,
      };
    const { frame } = request;
    if (
      ![
        [1024, 768],
        [4096, 2048],
      ].some(([w, h]) => frame.width === w && frame.height === h) ||
      frame.strokes.length > 1025
    )
      throw Error("fixture-bounds");
    if (request.evict) cache.clear();
    if (request.fault === "page") {
      const first = frame.strokes[0]?.pages[0];
      if (!first) throw Error("fault-fixture-missing-page");
      first.scene += 1n;
    }
    if (!request.fresh || request.gpu) await cache.prepare(frame, measure);
    let pixels: Uint8Array;
    let environment: unknown;
    if (request.gpu) {
      if (frame.strokes.length !== 1) throw Error("gpu-control-shape");
      const value = cache.drawable(frame.strokes[0]!, measure);
      try {
        const gpu = gpuReference(kit, value.path, frame.width, frame.height);
        pixels = gpu.pixels;
        environment = gpu.environment;
      } finally {
        if (value.transient) value.path.delete();
      }
    } else if (request.fresh) pixels = oracle(kit, frame, measure);
    else pixels = render(kit, cache, frame, measure, request.fault === "allocation");
    const data = measure.run(
      "image-data-copy",
      () => new ImageData(new Uint8ClampedArray(pixels), frame.width, frame.height),
    );
    measure.enter("bitmap-conversion");
    const conversion = performance.now();
    measure.endBusy();
    bitmap = await createImageBitmap(data);
    measure.beginBusy();
    measure.record("bitmap-conversion", performance.now() - conversion);
    measure.endBusy();
    return {
      kind: "result",
      id: request.id,
      status: "completed",
      stage: measure.stage,
      units: measure.units,
      pixels,
      bitmap,
      cursors: cache.cursors(),
      hits: cache.hits,
      builds: cache.builds,
      appendedVerbs: cache.appendedVerbs,
      handles: cache.handles(),
      heap: heapCapacity(kit),
      uninterruptedBusyMs: measure.busyPeriods,
      workerWallMs: performance.now() - start,
      environment,
    };
  } catch (error: unknown) {
    bitmap?.close();
    cache.clear();
    measure.endBusy();
    return {
      kind: "result",
      id: request.id,
      status: "failed",
      stage: measure.stage,
      reason: error instanceof Error ? error.message : "worker-failure",
      units: measure.units,
      cursors: [],
      hits: cache.hits,
      builds: cache.builds,
      appendedVerbs: cache.appendedVerbs,
      handles: cache.handles(),
      heap: heapCapacity(kit),
      uninterruptedBusyMs: measure.busyPeriods,
      workerWallMs: performance.now() - start,
    };
  } finally {
    if (request.fresh) cache.clear();
  }
}
let busy = false;
self.onmessage = (event: MessageEvent<Request>) => {
  if (busy) throw Error("worker-inflight-limit");
  busy = true;
  void run(event.data)
    .then((value) => {
      const transfer: Transferable[] = [];
      if (value.pixels) transfer.push(value.pixels.buffer);
      if (value.bitmap) transfer.push(value.bitmap);
      const start = performance.now();
      self.postMessage(value, { transfer });
      self.postMessage({ kind: "delivery", id: value.id, ms: performance.now() - start });
    })
    .finally(() => {
      busy = false;
    });
};
