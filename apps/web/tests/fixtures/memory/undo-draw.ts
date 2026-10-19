import type { CanvasKit } from "canvaskit-wasm";
import { Presentation, publishFrame } from "../../../src/memory/presentation.ts";
import type { PreparedPath } from "./undo-paths.ts";

export function drawPaths(kit: CanvasKit, display: Presentation, paths: PreparedPath[]) {
  const { staging, front } = display.owner;
  if (!staging || !front) throw Error("missing-surface");
  const paint = new kit.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(kit.PaintStyle.Fill);
  const start = performance.now();
  let maximumDrawMs = 0;
  let drawMs = 0;
  staging.getCanvas().clear(kit.WHITE);
  try {
    for (const { path, color } of paths) {
      paint.setColor(kit.Color4f(color[0]!, color[1]!, color[2]!, 1));
      const drawStart = performance.now();
      staging.getCanvas().drawPath(path, paint);
      const elapsed = performance.now() - drawStart;
      drawMs += elapsed;
      maximumDrawMs = Math.max(maximumDrawMs, elapsed);
    }
    const flushStart = performance.now();
    staging.flush();
    const flushMs = performance.now() - flushStart;
    const snapshotStart = performance.now();
    const image = staging.makeImageSnapshot();
    if (!image) throw Error("snapshot-failed");
    const imageSnapshotMs = performance.now() - snapshotStart;
    const publishStart = performance.now();
    try {
      publishFrame(kit, front, image);
      return {
        drawMs,
        maximumDrawMs,
        flushMs,
        imageSnapshotMs,
        publishSubmitMs: performance.now() - publishStart,
        uninterruptedRenderMs: performance.now() - start,
      };
    } finally {
      image.delete();
    }
  } finally {
    paint.delete();
  }
}

export function pixels(kit: CanvasKit, display: Presentation): Uint8Array {
  const { staging, width, height } = display.owner;
  const value = staging?.getCanvas().readPixels(0, 0, {
    width,
    height,
    colorType: kit.ColorType.RGBA_8888,
    alphaType: kit.AlphaType.Unpremul,
    colorSpace: kit.ColorSpace.SRGB,
  });
  if (!(value instanceof Uint8Array)) throw Error("missing-pixels");
  return value;
}

export function comparePixels(reference: Uint8Array, candidate: Uint8Array) {
  if (reference.length !== candidate.length) throw Error("pixel-size");
  let differentChannels = 0;
  let maximumChannelDelta = 0;
  let totalChannelDelta = 0;
  for (let index = 0; index < reference.length; index++) {
    const delta = Math.abs(reference[index]! - candidate[index]!);
    if (delta !== 0) differentChannels++;
    maximumChannelDelta = Math.max(maximumChannelDelta, delta);
    totalChannelDelta += delta;
  }
  return {
    differentChannels,
    maximumChannelDelta,
    totalChannelDelta,
    comparedChannels: reference.length,
  };
}
