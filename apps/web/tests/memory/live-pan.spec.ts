import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { open, ready, stroke, diagnostics } from "./rotation-helpers.ts";
import { inkBounds } from "./pixel-bounds.ts";
const clip = { x: 100, y: 220, width: 1000, height: 350 };
async function pan(page: Page, from: number, to: number, finish = true) {
  await page.locator("[data-memory-canvas]").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(from, 560);
  await page.mouse.down();
  await page.mouse.move(to, 560);
  if (finish) {
    await page.mouse.up();
    await page.keyboard.up("Space");
    await ready(page);
  }
}
test("WMP-11-LIVE 10percent offscreen ink appears during held pan and repeated promotions preserve cancel base", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  for (let i = 0; i < 11; i++) {
    await page.locator('[data-memory-zoom="out"]').click();
    await ready(page);
  }
  await expect(page.locator('[data-memory-zoom="out"]')).toBeDisabled();
  await stroke(page, 300, 300, 100, 80);
  await ready(page);
  await pan(page, 1000, 100);
  expect((await inkBounds(page, clip)).maxX).toBe(-1);
  await stroke(page, 800, 400, 80, 50);
  await ready(page);
  const before = await page.screenshot({ clip });
  await pan(page, 200, 1000, false);
  // The old source contains only the right-hand stroke: this left-hand ink was
  // entirely offscreen at PanBegin and must be reconstructed before any release.
  await expect.poll(async () => (await inkBounds(page, clip)).minX).toBeLessThan(200);
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await page.screenshot({ path: info.outputPath("10percent-offscreen-held.png") });
  const first = await inkBounds(page, clip);
  await page.mouse.move(960, 560);
  await ready(page);
  const second = await inkBounds(page, clip);
  expect(second.minX - first.minX).toBe(-40);
  await page.mouse.move(1000, 560);
  await ready(page);
  expect(await inkBounds(page, clip)).toEqual(first);
  await page.screenshot({ path: info.outputPath("multiple-completions-reversed.png") });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(before)).toBe(true);
  await page.screenshot({ path: info.outputPath("cancel-restored.png") });
  await pan(page, 200, 1000, false);
  await ready(page);
  const held = await page.screenshot({ clip });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(held)).toBe(true);
  await page.screenshot({ path: info.outputPath("released-no-jump.png") });
  const result = await diagnostics(page);
  expect(result.render.peakImages).toBeLessThanOrEqual(2);
  expect(result.render.pendingMs).toBe(0);
  await info.attach("resource-diagnostics", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
});
