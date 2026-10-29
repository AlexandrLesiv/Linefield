import { captureDrawing } from "./vector-drawing-capture.mjs";

/** Actual-input translation of the visible tail; canonical source samples must not change. */
export async function checkWideTranslation(page, frame, clip, original) {
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
  const before = await raw();
  await host.locator("#select").click();
  await host.locator("#selection-pick-mode").click();
  const box = await host.locator("canvas").boundingBox();
  await page.mouse.click(box.x + 12.5, box.y + 300);
  await page.mouse.move(box.x + 12.5, box.y + 300);
  await page.mouse.down();
  await page.mouse.move(box.x + 42.5, box.y + 320, { steps: 8 });
  await page.mouse.up();
  const moved = await captureDrawing(frame, clip);
  if (JSON.stringify(moved) === JSON.stringify(original))
    throw Error("Wide-tail translation did not change pixels");
  if (JSON.stringify(before) !== JSON.stringify(await raw()))
    throw Error("Translation changed canonical raw samples");
  await host.locator("#undo").click();
  if (JSON.stringify(await captureDrawing(frame, clip)) !== JSON.stringify(original))
    throw Error("Translation Undo changed original tail pixels");
  await host.locator("#redo").click();
  if (JSON.stringify(await captureDrawing(frame, clip)) !== JSON.stringify(moved))
    throw Error("Translation Redo changed moved tail pixels");
  await host.locator("#undo").click();
  await host.locator("#selection-clear").click();
  if (JSON.stringify(before) !== JSON.stringify(await raw()))
    throw Error("Translation history changed canonical raw samples");
  return moved;
}
