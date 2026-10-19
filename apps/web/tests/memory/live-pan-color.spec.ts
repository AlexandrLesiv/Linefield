import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { open, ready, stroke } from "./rotation-helpers.ts";
const clip = { x: 80, y: 200, width: 1100, height: 450 };
async function counts(page: Page) {
  const png = await page.screenshot({ clip });
  return page.evaluate(async (encoded) => {
    const bytes = Uint8Array.from(atob(encoded), (v) => v.charCodeAt(0));
    const image = await createImageBitmap(new Blob([bytes], { type: "image/png" }));
    const c = new OffscreenCanvas(image.width, image.height).getContext("2d")!;
    c.drawImage(image, 0, 0);
    const data = c.getImageData(0, 0, image.width, image.height).data;
    let red = 0,
      black = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i]! > 140 && data[i + 1]! < 80 && data[i + 2]! < 80) red++;
      if (data[i]! < 80 && data[i + 1]! < 80 && data[i + 2]! < 80) black++;
    }
    image.close();
    return { red, black };
  }, png.toString("base64"));
}
test("WMP-11-LIVE rotated thick colored offscreen ink joins retained ink during continuous movement", async ({
  page,
}, info) => {
  await open(page);
  for (let i = 0; i < 11; i++) {
    await page.locator('[data-memory-zoom="out"]').click();
    await ready(page);
  }
  await page.locator("[data-memory-width]").focus();
  await page.keyboard.press("End");
  await page.locator("[data-memory-color]").fill("#ff0000");
  await stroke(page, 150, 330, 100, 15);
  await ready(page);
  await page.locator("[data-memory-color]").fill("#000000");
  await stroke(page, 700, 480, 60, 15);
  await ready(page);
  await page.locator('[data-memory-rotation="right"]').click();
  await ready(page);
  await page.locator("[data-memory-canvas]").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(650, 600);
  await page.mouse.down();
  await page.mouse.move(350, 600);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await counts(page)).red).toBe(0);
  const before = await page.screenshot({ clip });
  await page.keyboard.down("Space");
  await page.mouse.move(400, 600);
  await page.mouse.down();
  for (let i = 1; i <= 40; i++) {
    await page.mouse.move(400 + i * 7, 600);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    if (i === 24 || i === 40) {
      const c = await counts(page);
      expect(c.red).toBeGreaterThan(100);
      expect(c.black).toBeGreaterThan(100);
      await page.screenshot({ path: info.outputPath(`rotated-colored-moving-${i}.png`) });
    }
  }
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await ready(page);
  const held = await page.screenshot({ clip });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(held)).toBe(true);
  await page.screenshot({ path: info.outputPath("rotated-colored-release.png") });
  await page.keyboard.down("Space");
  await page.mouse.move(500, 600);
  await page.mouse.down();
  await page.mouse.move(220, 600);
  await ready(page);
  expect((await page.screenshot({ clip })).equals(before)).toBe(true);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(held)).toBe(true);
});
