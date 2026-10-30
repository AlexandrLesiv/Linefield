import assert from "node:assert/strict";
export async function cameraChecks(page, frame) {
  const canvas = frame.locator("canvas"),
    box = await canvas.boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const before = await frame.evaluate(() => lab.view());
  await canvas.focus();
  await page.mouse.move(x, y);
  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(x + 100, y + 70, { steps: 20 });
  const during = await frame.evaluate(() => lab.view());
  assert.notEqual(during.cx, before.cx, "Pan changes before release");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await page.mouse.wheel(0, 100);
  await frame.waitForFunction(() => !lab.renderPending());
  const bytes = await canvas.screenshot();
  const red = await frame.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(
      new Blob([Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))], { type: "image/png" }),
    );
    const surface = new OffscreenCanvas(bitmap.width, bitmap.height),
      c = surface.getContext("2d");
    c.drawImage(bitmap, 0, 0);
    bitmap.close();
    const p = c.getImageData(0, 0, surface.width, surface.height).data;
    let redPixels = 0;
    for (let i = 0; i < p.length; i += 4)
      if (p[i] > 240 && p[i + 1] < 20 && p[i + 2] < 20) redPixels++;
    return redPixels;
  }, bytes.toString("base64"));
  assert.ok(red > 100, "Image remains visibly red after pan and zoom");
  return { panBeforeRelease: true, panZoomRedPixels: red };
}
