import type { CanvasKit, Paint } from "canvaskit-wasm";
import type { Frame } from "./protocol.ts";
import type { Cache } from "./cache.ts";
import type { Measure } from "./measure.ts";
export function render(
  kit: CanvasKit,
  cache: Cache,
  frame: Frame,
  measure: Measure,
  fail: boolean,
) {
  const surface = measure.run(
    "surface-allocation",
    () => (fail ? null : kit.MakeSurface(frame.width, frame.height)),
    (v) => v?.dispose(),
  );
  if (!surface) throw Error("cpu-surface-allocation");
  let paint: Paint | undefined;
  try {
    paint = measure.run(
      "paint-allocation",
      () => new kit.Paint(),
      (v) => v.delete(),
    );
    paint.setAntiAlias(true);
    paint.setStyle(kit.PaintStyle.Fill);
    const canvas = surface.getCanvas();
    measure.run("surface-clear", () => canvas.clear(kit.WHITE));
    for (const stroke of frame.strokes) {
      const value = cache.drawable(stroke, measure);
      try {
        paint.setColor(new Float32Array(value.color));
        measure.run("whole-path-draw", () => canvas.drawPath(value.path, paint!));
      } finally {
        if (value.transient) value.path.delete();
      }
    }
    measure.run("surface-flush", () => surface.flush());
    const pixels = measure.run("readback", () =>
      canvas.readPixels(0, 0, {
        width: frame.width,
        height: frame.height,
        colorType: kit.ColorType.RGBA_8888,
        alphaType: kit.AlphaType.Unpremul,
        colorSpace: kit.ColorSpace.SRGB,
      }),
    );
    if (!(pixels instanceof Uint8Array)) throw Error("cpu-readback");
    return pixels;
  } finally {
    paint?.delete();
    surface.dispose();
  }
}
