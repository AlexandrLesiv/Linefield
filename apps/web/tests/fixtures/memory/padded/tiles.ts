import type { CanvasKit, Paint, Path } from "canvaskit-wasm";
import { tileFrame } from "../cpu-raster/raster.ts";

export function tiles(
  kit: CanvasKit,
  path: Path,
  paint: Paint,
  width: number,
  height: number,
  halo: number,
  legacy: boolean,
  progress: (name: string) => void,
) {
  let maximumUnitMs = 0;
  const measure = <T>(name: string, action: () => T) => {
    progress(name);
    const start = performance.now();
    const value = action();
    maximumUnitMs = Math.max(maximumUnitMs, performance.now() - start);
    return value;
  };
  if (legacy) return { ...tileFrame(kit, path, paint, width, height, measure), maximumUnitMs };
  const start = performance.now();
  const edge = 128 + 2 * halo;
  const output = new Uint8Array(width * height * 4);
  const target = kit.MakeSurface(edge, edge);
  if (!target) throw Error("padded-allocation");
  const canvas = target.getCanvas();
  const info = {
    width: edge,
    height: edge,
    colorType: kit.ColorType.RGBA_8888,
    alphaType: kit.AlphaType.Unpremul,
    colorSpace: kit.ColorSpace.SRGB,
  };
  let count = 0;
  try {
    for (let y = 0; y < height; y += 128) {
      for (let x = 0; x < width; x += 128) {
        measure(`tile-${count}`, () => {
          canvas.clear(kit.WHITE);
          canvas.save();
          try {
            canvas.translate(-(x - halo), -(y - halo));
            canvas.clipRect(kit.LTRBRect(0, 0, width, height), kit.ClipOp.Intersect, false);
            canvas.drawPath(path, paint);
          } finally {
            canvas.restore();
          }
          target.flush();
        });
        const pixels = measure(`copy-${count}`, () => canvas.readPixels(0, 0, info));
        if (!(pixels instanceof Uint8Array)) throw Error("padded-readback");
        for (let row = 0; row < 128; row++) {
          const offset = ((row + halo) * edge + halo) * 4;
          output.set(pixels.subarray(offset, offset + 512), ((y + row) * width + x) * 4);
        }
        count++;
      }
    }
    return { output, tiles: count, frameMs: performance.now() - start, maximumUnitMs };
  } finally {
    target.dispose();
  }
}
