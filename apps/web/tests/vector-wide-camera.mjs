import { captureDrawing } from "./vector-drawing-capture.mjs";

/** Rotate through actual browser input; compare only the common visible tail. */
export async function checkWideCamera(page, frame, clip, original) {
  const host = page.frameLocator("iframe");
  const raw = () =>
    frame.evaluate(() =>
      Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
        String(lab.core.raw_region(0, i, 0)),
        String(lab.core.raw_region(0, i, 1)),
        lab.core.raw_local(0, i, 0),
        lab.core.raw_local(0, i, 1),
        lab.core.raw_point(0, i, 2),
      ]),
    );
  const before = JSON.stringify(await raw());
  const views = [];
  const box = await host.locator("canvas").boundingBox();
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  await host.locator("#rotate").click();
  for (const angle of [0.08, -0.08]) {
    await page.mouse.move(cx + 250, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 250 * Math.cos(angle), cy + 250 * Math.sin(angle), { steps: 8 });
    await page.mouse.up();
    const rotated = await captureDrawing(frame, clip);
    if (JSON.stringify(rotated) === JSON.stringify(original))
      throw Error("Camera rotation did not change tail pixels");
    views.push(rotated);
    await host.locator("#rotation-reset").click();
    if (JSON.stringify(await captureDrawing(frame, clip)) !== JSON.stringify(original))
      throw Error("Rotation reset changed tail pixels");
  }
  if (JSON.stringify(await raw()) !== before)
    throw Error("Camera rotation changed canonical samples");
  return views;
}
