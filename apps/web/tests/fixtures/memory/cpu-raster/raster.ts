import type { CanvasKit, Paint, Path } from "canvaskit-wasm";
import { comparePixels } from "../undo-draw.ts";

export function raster(kit: CanvasKit, width: number, height: number) {
  const target = kit.MakeSurface(width, height);
  if (!target) throw Error("cpu-surface-allocation");
  const canvas = target.getCanvas();
  const info = {
    width,
    height,
    colorType: kit.ColorType.RGBA_8888,
    alphaType: kit.AlphaType.Unpremul,
    colorSpace: kit.ColorSpace.SRGB,
  };
  return {
    draw(path: Path, paint: Paint, x = 0, y = 0) {
      canvas.clear(kit.WHITE);
      canvas.save();
      try {
        canvas.translate(-x, -y);
        canvas.drawPath(path, paint);
      } finally {
        canvas.restore();
      }
      target.flush();
    },
    pixels() {
      const value = canvas.readPixels(0, 0, info);
      if (!(value instanceof Uint8Array)) throw Error("cpu-readback");
      return value;
    },
    dispose() {
      target.dispose();
    },
  };
}

export function crop(pixels: Uint8Array, width: number, x: number, y: number, size: number) {
  const result = new Uint8Array(size * size * 4);
  for (let row = 0; row < size; row++) {
    const start = ((y + row) * width + x) * 4;
    result.set(pixels.subarray(start, start + size * 4), row * size * 4);
  }
  return result;
}

export function inkPixels(pixels: Uint8Array) {
  let count = 0;
  for (let i = 0; i < pixels.length; i += 4)
    if (pixels[i]! < 255 || pixels[i + 1]! < 255 || pixels[i + 2]! < 255) count++;
  return count;
}

export function tileFrame(
  kit: CanvasKit,
  path: Path,
  paint: Paint,
  width: number,
  height: number,
  measure: <T>(name: string, action: () => T) => T,
) {
  const start = performance.now();
  const output = new Uint8Array(width * height * 4);
  const tile = raster(kit, 128, 128);
  let tiles = 0;
  try {
    for (let y = 0; y < height; y += 128) {
      for (let x = 0; x < width; x += 128) {
        measure(`frame-tile-${tiles}`, () => tile.draw(path, paint, x, y));
        const pixels = measure(`frame-copy-${tiles}`, () => tile.pixels());
        for (let row = 0; row < 128; row++)
          output.set(pixels.subarray(row * 512, (row + 1) * 512), ((y + row) * width + x) * 4);
        tiles++;
        if (performance.now() - start > 500) throw Error("cpu-frame-cold-limit");
      }
    }
    return { output, tiles, frameMs: performance.now() - start };
  } finally {
    tile.dispose();
  }
}
export { comparePixels };
