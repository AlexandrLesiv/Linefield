import type { CanvasKit, Paint, Path } from "canvaskit-wasm";
import { surface } from "../repaint/surface.ts";
import { raster } from "./raster.ts";

export function warmup(kit: CanvasKit, paint: Paint) {
  const warm = raster(kit, 16, 16);
  const builder = new kit.PathBuilder();
  const path = builder.addRect(kit.LTRBRect(2, 2, 8, 8)).detach();
  try {
    warm.draw(path, paint);
    warm.pixels();
  } finally {
    path.delete();
    builder.delete();
    warm.dispose();
  }
}

export function cpuReference(
  kit: CanvasKit,
  path: Path,
  paint: Paint,
  width: number,
  height: number,
) {
  const whole = raster(kit, width, height);
  const start = performance.now();
  try {
    whole.draw(path, paint);
    const drawMs = performance.now() - start;
    const readStart = performance.now();
    const pixels = whole.pixels();
    return { pixels, drawMs, readMs: performance.now() - readStart };
  } finally {
    whole.dispose();
  }
}

export function gpuReference(kit: CanvasKit, path: Path, width: number, height: number) {
  const gpu = surface(kit, width, height);
  try {
    const start = performance.now();
    gpu.canvas.clear(kit.WHITE);
    gpu.draw(path);
    gpu.flush();
    const drawFlushMs = performance.now() - start;
    const readStart = performance.now();
    const pixels = gpu.pixels();
    return {
      pixels,
      environment: gpu.environment,
      drawFlushMs,
      readMs: performance.now() - readStart,
    };
  } finally {
    gpu.dispose();
  }
}

export function turn() {
  return new Promise<void>((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      channel.port2.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}
