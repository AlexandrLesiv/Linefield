import type { CanvasKit, Paint, Path } from "canvaskit-wasm";
import type { Frame } from "../untiled/protocol.ts";
import { appendPathPage } from "../../../../src/memory/path-page.ts";
export function raster(kit: CanvasKit, frame: Frame) {
  const surface = kit.MakeSurface(frame.width, frame.height);
  if (!surface) throw Error("candidate-surface");
  let paint: Paint | undefined;
  try {
    paint = new kit.Paint();
    paint.setAntiAlias(true);
    paint.setStyle(kit.PaintStyle.Fill);
    surface.getCanvas().clear(kit.WHITE);
    for (const stroke of frame.strokes) {
      const builder = new kit.PathBuilder();
      let path: Path | undefined;
      try {
        for (const page of stroke.pages) appendPathPage(kit, builder, page);
        path = builder.snapshot();
        const color = stroke.pages[0];
        if (!color) continue;
        paint.setColor(kit.Color4f(color.red, color.green, color.blue, 1));
        surface.getCanvas().drawPath(path, paint);
      } finally {
        path?.delete();
        builder.delete();
      }
    }
    surface.flush();
    const pixels = surface.getCanvas().readPixels(0, 0, {
      width: frame.width,
      height: frame.height,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Unpremul,
      colorSpace: kit.ColorSpace.SRGB,
    });
    if (!(pixels instanceof Uint8Array)) throw Error("candidate-readback");
    return pixels;
  } finally {
    paint?.delete();
    surface.dispose();
  }
}
