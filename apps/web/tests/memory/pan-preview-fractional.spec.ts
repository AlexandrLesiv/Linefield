import { test, expect } from "@playwright/test";
import { inkBounds } from "./pixel-bounds.ts";
test.use({ deviceScaleFactor: 2 });
test("WMP-11 fractional pan at125percent DPR2 keeps vector replacement within one backing pixel", async ({
  page,
}, info) => {
  const canvas = page.locator("[data-memory-canvas]");
  const ready = () => expect(canvas).toHaveAttribute("data-state", "ready");
  const clip = { x: 100, y: 200, width: 650, height: 350 };
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready();
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(400, 350, { steps: 8 });
  await page.mouse.up();
  await ready();
  await page.locator('[data-memory-zoom="in"]').click();
  await ready();
  await canvas.focus();
  const before = await inkBounds(page, clip);
  await page.keyboard.down("Space");
  await page.mouse.move(550.25, 450.25);
  await page.mouse.down();
  await page.mouse.move(610.5, 490.5);
  const held = await inkBounds(page, clip);
  expect(Math.abs(held.minX - before.minX - 120.5)).toBeLessThanOrEqual(1);
  expect(Math.abs(held.minY - before.minY - 80.5)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath("fractional-held-dpr2.png") });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready();
  const exact = await inkBounds(page, clip);
  for (const key of ["minX", "maxX", "minY", "maxY"] as const)
    expect(Math.abs(exact[key] - held[key])).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath("fractional-exact-dpr2.png") });
  await page.keyboard.down("Space");
  await page.mouse.move(550, 450);
  await page.mouse.down();
  await page.mouse.move(600.25, 480.25);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready();
  expect(await inkBounds(page, clip)).toEqual(exact);
});
