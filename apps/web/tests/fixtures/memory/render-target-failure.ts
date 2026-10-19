import type { CanvasKit } from "canvaskit-wasm";
import { Presentation } from "../../../src/memory/presentation.ts";
import { pixelDigest } from "./geometry.ts";
export async function renderTargetFailure(kit: CanvasKit, canvas: HTMLCanvasElement) {
  const d = new Presentation(kit, canvas, 512, 384);
  const identity = [1, 0, 0, 1, 0, 0];
  const old = [0, -1, 1, 0, 360, 20];
  const paint = new kit.Paint();
  try {
    paint.setColor(kit.BLACK);
    d.render((c) => c.drawRect(kit.XYWHRect(30, 40, 80, 120), paint));
    d.transform(old, false);
    const before = await pixelDigest(d.frontPixels());
    d.owner.staging!.getCanvas().clear(kit.RED);
    const rejected = d.commitTarget(identity, false, old, false, () => false);
    if (rejected || (await pixelDigest(d.frontPixels())) !== before)
      throw Error("adoption rollback pixels");
    if (d.stats().live.image !== 1 || d.stats().peak.image !== 2)
      throw Error("candidate rejection resources");
    let threw = false;
    try {
      d.commitTarget(identity, false, old, false, () => {
        throw Error("fixture-adoption");
      });
    } catch {
      threw = true;
    }
    if (!threw || (await pixelDigest(d.frontPixels())) !== before)
      throw Error("throwing adoption rollback");
    if (!d.commitTarget(identity, false, identity, false, () => true))
      throw Error("candidate success");
    if ((await pixelDigest(d.frontPixels())) === before) throw Error("candidate was not submitted");
    if (d.stats().live.image !== 1 || d.stats().peak.image !== 2)
      throw Error("successful promotion resources");
    return { rejectionRestored: true, throwRestored: true, peakImages: 2 };
  } finally {
    paint.delete();
    d.dispose();
  }
}
