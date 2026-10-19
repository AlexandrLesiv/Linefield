import CanvasKitInit from "canvaskit-wasm";
import type { Path } from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import { appendPathPage } from "../../../../src/memory/path-page.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
import { cpuReference, gpuReference, warmup, turn } from "../cpu-raster/reference.ts";
import { comparePixels, inkPixels } from "../cpu-raster/raster.ts";
import { difference } from "./difference.ts";
import { tiles } from "./tiles.ts";

export type Request = {
  width: number;
  height: number;
  halo: number;
  legacy: boolean;
  pages: PathPage[];
};
const ready = CanvasKitInit({ locateFile: () => canvasWasm });
async function run({ width, height, halo, legacy, pages }: Request) {
  if (
    ![
      [1024, 768],
      [4096, 2048],
    ].some(([w, h]) => w === width && h === height) ||
    ![0, 1, 2, 4, 8].includes(halo) ||
    (legacy && halo !== 0) ||
    !pages.length ||
    pages.length > 256
  )
    throw Error("fixture-bounds");
  let stage = "initialization";
  const observations: Record<string, unknown> = {};
  const progress = (name: string) => {
    stage = name;
    self.postMessage({ kind: "progress", stage, details: observations });
  };
  progress("renderer-initialization");
  const kit = await ready;
  const builder = new kit.PathBuilder();
  const paint = new kit.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(kit.PaintStyle.Fill);
  paint.setColor(kit.BLACK);
  let path: Path | undefined;
  let reference: Uint8Array | undefined,
    candidate: Uint8Array | undefined,
    gpuPixels: Uint8Array | undefined;
  try {
    warmup(kit, paint);
    for (const [index, page] of pages.entries()) {
      progress(`path-page-${index}`);
      appendPathPage(kit, builder, page);
      await turn();
    }
    path = builder.snapshot();
    progress("cpu-whole-reference");
    const whole = cpuReference(kit, path, paint, width, height);
    reference = whole.pixels;
    observations.cpuWholeDrawMs = whole.drawMs;
    observations.cpuWholeReadMs = whole.readMs;
    progress("cpu-reference-repeatability");
    const repeatParity = comparePixels(
      reference,
      cpuReference(kit, path, paint, width, height).pixels,
    );
    observations.referenceParity = repeatParity;
    if (repeatParity.differentChannels !== 0) throw Error("unstable-reference");
    const frame = tiles(kit, path, paint, width, height, halo, legacy, progress);
    candidate = frame.output;
    observations.tiles = frame.tiles;
    observations.frameMs = frame.frameMs;
    observations.maximumUnitMs = frame.maximumUnitMs;
    progress("tile-comparison");
    const parity = difference(reference, candidate, width, height);
    observations.tileParity = parity;
    progress("gpu-reference");
    const gpu = gpuReference(kit, path, width, height);
    gpuPixels = gpu.pixels;
    observations.environment = gpu.environment;
    observations.gpuDrawFlushMs = gpu.drawFlushMs;
    observations.gpuReadMs = gpu.readMs;
    observations.cpuGpuDifference = comparePixels(gpuPixels, candidate);
    observations.cpuInkPixels = inkPixels(candidate);
    observations.gpuInkPixels = inkPixels(gpuPixels);
    const lost = inkPixels(gpuPixels) > 0 && inkPixels(candidate) === 0;
    progress("bitmap-conversion");
    const bitmap = await createImageBitmap(
      new ImageData(new Uint8ClampedArray(candidate), width, height),
    );
    return {
      kind: "result",
      status: "completed",
      outcome: parity.differentChannels || lost ? "mismatch" : "match",
      reason: lost
        ? "thin-artwork-disappeared"
        : parity.differentChannels
          ? "tile-whole-mismatch"
          : "none",
      observations,
      reference,
      candidate,
      gpuPixels,
      bitmap,
      stage,
      scope: "Gate1 correctness only; timings descriptive, no performance acceptance",
    };
  } catch (error: unknown) {
    return {
      kind: "result",
      status: "failed",
      outcome: "failure",
      stage,
      observations,
      reason: error instanceof Error ? error.message : "candidate-failure",
      reference,
      candidate,
      gpuPixels,
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
      for (const pixels of [value.reference, value.candidate, value.gpuPixels])
        if (pixels) transfer.push(pixels.buffer);
      if (value.bitmap) transfer.push(value.bitmap);
      self.postMessage(value, { transfer });
    })
    .catch((error: unknown) =>
      self.postMessage({
        kind: "failure",
        reason: error instanceof Error ? error.message : "worker-failed",
      }),
    );
};
