import CanvasKitInit from "canvaskit-wasm";
import type { Path } from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import { appendPathPage } from "../../../../src/memory/path-page.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
import { cpuReference as cpuWhole, gpuReference, turn, warmup } from "./reference.ts";
import { raster, crop, inkPixels, tileFrame, comparePixels } from "./raster.ts";

export type Request = { width: number; height: number; pages: PathPage[] };
const ready = CanvasKitInit({ locateFile: () => canvasWasm });
async function run({ width, height, pages }: Request) {
  const metrics = {
    maximumUnitMs: 0,
    unitCount: 0,
    constructionMs: 0,
    frameMs: 0,
    coldMs: 0,
    lastOperation: "",
    lastOperationMs: 0,
  };
  let stage = "initialization";
  const progress = (name: string) => {
    stage = name;
    self.postMessage({ kind: "progress", stage, details: { ...metrics } });
  };
  const measure = <T>(name: string, action: () => T): T => {
    progress(name);
    const start = performance.now();
    const value = action();
    const elapsed = performance.now() - start;
    metrics.lastOperation = name;
    metrics.lastOperationMs = elapsed;
    metrics.maximumUnitMs = Math.max(metrics.maximumUnitMs, elapsed);
    metrics.unitCount++;
    if (elapsed > 8) throw Error("synchronous-unit-limit");
    return value;
  };
  if (
    ![
      [1024, 768],
      [4096, 2048],
    ].some(([w, h]) => w === width && h === height) ||
    pages.length === 0 ||
    pages.length > 256
  )
    throw Error("fixture-bounds");
  progress("renderer-initialization");
  const kit = await ready;
  const paint = new kit.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(kit.PaintStyle.Fill);
  paint.setColor(kit.BLACK);
  const builder = new kit.PathBuilder();
  let path: Path | undefined;
  let original: Uint8Array | undefined;
  let cpuReference: Uint8Array | undefined;
  let candidate: Uint8Array | undefined;
  const observations: Record<string, unknown> = {};
  try {
    progress("cpu-library-warmup");
    warmup(kit, paint);
    const constructionStart = performance.now();
    for (const [index, page] of pages.entries()) {
      measure(`prefix-page-${index}`, () => appendPathPage(kit, builder, page));
      await turn();
    }
    measure("prefix-snapshot", () => {
      path = builder.snapshot();
    });
    metrics.constructionMs = performance.now() - constructionStart;
    if (!path) throw Error("prefix-path");
    const stablePath = path;
    const x = width / 2 - 64;
    const y = height / 2 - 64;
    const probeStart = performance.now();
    progress("cpu-probe-allocation");
    const probe = raster(kit, 128, 128);
    let probePixels: Uint8Array;
    try {
      measure("cpu-probe-draw", () => probe.draw(stablePath, paint, x, y));
      probePixels = measure("cpu-probe-copy", () => probe.pixels());
    } finally {
      probe.dispose();
    }
    observations.firstProbeMs = performance.now() - probeStart;
    metrics.coldMs = metrics.constructionMs + performance.now() - probeStart;
    progress("cpu-full-frame");
    const frame = tileFrame(kit, stablePath, paint, width, height, measure);
    candidate = frame.output;
    metrics.frameMs = frame.frameMs;
    metrics.coldMs += frame.frameMs;
    observations.tiles = frame.tiles;
    if (metrics.coldMs > 500) throw Error("cpu-frame-cold-limit");
    progress("cpu-whole-reference");
    const whole = cpuWhole(kit, stablePath, paint, width, height);
    const wholePixels = whole.pixels;
    cpuReference = wholePixels;
    observations.cpuReferenceMs = whole.drawMs + whole.readMs;
    observations.cpuReferenceDrawMs = whole.drawMs;
    observations.cpuReferenceReadMs = whole.readMs;
    const probeParity = comparePixels(crop(wholePixels, width, x, y, 128), probePixels);
    observations.probeParity = probeParity;
    if (probeParity.differentChannels) throw Error("cpu-probe-whole-mismatch");
    observations.tileParity = comparePixels(wholePixels, candidate);
    if (comparePixels(wholePixels, candidate).differentChannels)
      throw Error("cpu-tile-whole-mismatch");
    progress("cpu-evicted-tile-revisit");
    const revisit = raster(kit, 128, 128);
    try {
      measure("cpu-revisit-draw", () => revisit.draw(stablePath, paint, x, y));
      const parity = comparePixels(probePixels, revisit.pixels());
      observations.revisitParity = parity;
      if (parity.differentChannels) throw Error("cpu-revisit-mismatch");
    } finally {
      revisit.dispose();
    }
    progress("gpu-reference");
    const gpu = gpuReference(kit, stablePath, width, height);
    observations.environment = gpu.environment;
    observations.gpuDrawFlushMs = gpu.drawFlushMs;
    observations.gpuReadMs = gpu.readMs;
    original = gpu.pixels;
    observations.cpuGpuDifference = comparePixels(original, candidate);
    observations.cpuInkPixels = inkPixels(candidate);
    observations.gpuInkPixels = inkPixels(original);
    if (inkPixels(original) > 0 && inkPixels(candidate) === 0)
      throw Error("thin-artwork-disappeared");
    progress("cpu-bitmap-conversion");
    const conversionStart = performance.now();
    const bitmap = await createImageBitmap(
      new ImageData(new Uint8ClampedArray(candidate), width, height),
    );
    observations.bitmapConversionMs = performance.now() - conversionStart;
    metrics.coldMs += performance.now() - conversionStart;
    if (metrics.coldMs > 500) {
      bitmap.close();
      throw Error("cpu-transport-cold-limit");
    }
    return {
      kind: "result",
      status: "completed",
      verdict: "feasible-prefix",
      metrics,
      observations,
      original,
      cpuReference,
      candidate,
      bitmap,
      stage,
      limitation: "synthetic prefix; no physical latency, GPU completion or p95 acceptance",
    };
  } catch (error: unknown) {
    return {
      kind: "result",
      status: "failed",
      verdict: "rejected",
      stage,
      metrics,
      reason: error instanceof Error ? error.message : "candidate-failure",
      observations,
      original,
      cpuReference,
      candidate,
      bitmap: undefined,
    };
  } finally {
    path?.delete();
    builder.delete();
    paint.delete();
  }
}
self.onmessage = (event: MessageEvent<Request>) => {
  void run(event.data)
    .then((value) => {
      const transfer: Transferable[] = [];
      if (value.original) transfer.push(value.original.buffer);
      if (value.cpuReference) transfer.push(value.cpuReference.buffer);
      if (value.candidate) transfer.push(value.candidate.buffer);
      if (value.bitmap) transfer.push(value.bitmap);
      self.postMessage(
        { ...value, sentEpochMs: performance.timeOrigin + performance.now() },
        { transfer },
      );
    })
    .catch((error: unknown) =>
      self.postMessage({
        kind: "failure",
        reason: error instanceof Error ? error.message : "worker-failed",
      }),
    );
};
