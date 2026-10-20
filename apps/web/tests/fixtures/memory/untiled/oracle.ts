import type { CanvasKit, Path, Paint } from "canvaskit-wasm";
import { appendPathPage } from "../../../../src/memory/path-page.ts";
import type { Frame } from "./protocol.ts";
import type { Measure } from "./measure.ts";
// Deliberately independent of retained Cache/prepare/drawable and candidate render().
export function oracle(kit: CanvasKit, frame: Frame, measure: Measure) {
  const surface = kit.MakeSurface(frame.width, frame.height);
  if (!surface) throw Error("oracle-surface");
  let paint: Paint | undefined;
  try {
    paint = new kit.Paint();
    const canvas = surface.getCanvas();
    canvas.clear(kit.WHITE);
    paint.setAntiAlias(true);
    paint.setStyle(kit.PaintStyle.Fill);
    for (const stroke of frame.strokes) {
      if (stroke.from !== 0n) throw Error("oracle-not-fresh");
      const builder = new kit.PathBuilder();
      let path: Path | undefined;
      try {
        for (const [index, page] of stroke.pages.entries()) {
          measure.enter(`reference-page-${index}`);
          if (
            page.scene !== frame.state.scene ||
            page.stroke !== stroke.id ||
            page.geometry !== stroke.geometry
          )
            throw Error("oracle-page-identity");
          appendPathPage(kit, builder, page);
        }
        path = builder.snapshot();
        const color = stroke.pages[0];
        if (!color) throw Error("oracle-missing-color");
        paint.setColor(kit.Color4f(color.red, color.green, color.blue, 1));
        measure.enter("reference-whole-draw");
        canvas.drawPath(path, paint);
      } finally {
        path?.delete();
        builder.delete();
      }
    }
    surface.flush();
    measure.enter("reference-readback");
    const pixels = canvas.readPixels(0, 0, {
      width: frame.width,
      height: frame.height,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Unpremul,
      colorSpace: kit.ColorSpace.SRGB,
    });
    if (!(pixels instanceof Uint8Array)) throw Error("oracle-readback");
    return pixels;
  } finally {
    paint?.delete();
    surface.dispose();
  }
}
