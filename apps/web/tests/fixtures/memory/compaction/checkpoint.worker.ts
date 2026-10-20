import CanvasKitInit from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import init from "#preparation-bindings";
import type { Frame } from "../untiled/protocol.ts";
import { oracle } from "../untiled/oracle.ts";
import { Measure } from "../untiled/measure.ts";
import { prepare } from "./prepare.ts";
import { raster } from "./raster.ts";
const ready = Promise.all([CanvasKitInit({ locateFile: () => canvasWasm }), init()]);
let busy = false;
self.onmessage = (event: MessageEvent<{ frame: Frame; samples: bigint }>) => {
  if (busy) {
    self.postMessage({ status: "failed", reason: "worker-busy" });
    return;
  }
  busy = true;
  void run(event.data)
    .catch((error: unknown) => {
      self.postMessage({
        status: "failed",
        reason: error instanceof Error ? error.message : "worker-error",
      });
    })
    .finally(() => {
      busy = false;
    });
};
async function run({ frame, samples }: { frame: Frame; samples: bigint }) {
  const [kit, module] = await ready;
  const measure = new Measure(false, (stage) => self.postMessage({ status: "progress", stage }));
  const references = [oracle(kit, frame, measure), oracle(kit, frame, measure)];
  const strokes = [];
  const rows = [];
  for (const stroke of frame.strokes) {
    self.postMessage({ status: "progress", stage: "whole-prefix-preparation" });
    const selected = await prepare(frame, stroke, samples);
    strokes.push({ ...stroke, pages: selected.pages });
    rows.push(selected.stats);
  }
  self.postMessage({ status: "progress", stage: "candidate-whole-raster" });
  const pixels = raster(kit, { ...frame, strokes });
  const bitmap = await createImageBitmap(
    new ImageData(new Uint8ClampedArray(pixels), frame.width, frame.height),
  );
  self.postMessage(
    {
      status: "completed",
      pixels,
      references,
      bitmap,
      rows,
      preparationHeapCapacity: module.memory.buffer.byteLength,
    },
    { transfer: [pixels.buffer, references[0]!.buffer, references[1]!.buffer, bitmap] },
  );
}
