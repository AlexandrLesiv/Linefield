import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { inkBounds } from "./pixel-bounds.ts";
const clip = { x: 100, y: 200, width: 1000, height: 450 };
const ready = (page: Page) =>
  expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
async function open(page: Page) {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
}
async function stroke(page: Page, x: number, y: number, moves = 12) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 60, y + 8, { steps: moves });
  await page.mouse.up();
}
async function holdFrames(page: Page) {
  await page.evaluate(() => {
    const request = window.requestAnimationFrame.bind(window);
    const cancel = window.cancelAnimationFrame.bind(window);
    const pending = new Map<number, FrameRequestCallback>();
    let next = 1000000;
    window.requestAnimationFrame = (callback) => {
      pending.set(++next, callback);
      return next;
    };
    window.cancelAnimationFrame = (id) => {
      if (!pending.delete(id)) cancel(id);
    };
    document.addEventListener(
      "test-release-frames",
      () => {
        window.requestAnimationFrame = request;
        window.cancelAnimationFrame = cancel;
        for (const callback of pending.values()) request(callback);
        pending.clear();
      },
      { once: true },
    );
  });
}
async function drag(page: Page, from: number, to: number, finish = true) {
  await page.keyboard.down("Space");
  await page.mouse.move(from, 580);
  await page.mouse.down();
  await page.mouse.move(to, 580);
  if (finish) {
    await page.mouse.up();
    await page.keyboard.up("Space");
  }
}
test("WMP-11 dense continuous pan publishes positions before release and exact replacement has no jump", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  for (let i = 0; i < 64; i++)
    await stroke(page, 150 + (i % 8) * 100, 240 + Math.floor(i / 8) * 45);
  await ready(page);
  const original = await inkBounds(page, clip);
  await page.keyboard.down("Space");
  await page.mouse.move(900, 600);
  await page.mouse.down();
  for (let i = 1; i <= 32; i++) {
    await page.mouse.move(900 + i * 2, 600 + i);
    await page.evaluate(
      () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    if (i === 16 || i === 32) {
      const bounds = await inkBounds(page, clip);
      expect(bounds.minX - original.minX).toBe(i * 2);
      expect(bounds.maxX - original.maxX).toBe(i * 2);
      expect(bounds.minY - original.minY).toBe(i);
      expect(bounds.maxY - original.maxY).toBe(i);
      await page.screenshot({ path: info.outputPath(`held-${i}.png`) });
    }
  }
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "updating");
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  const held = await page.screenshot({ clip });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(held)).toBe(true);
  await page.screenshot({ path: info.outputPath("accurate-settled.png") });
  await page.locator("[data-memory-diagnostics]").click();
  const diagnostics = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(diagnostics.render.panPreviewPublications).toBeGreaterThanOrEqual(33);
  await info.attach("diagnostics", {
    body: JSON.stringify(diagnostics),
    contentType: "application/json",
  });
});
test("WMP-11 scheduling fixture moves recently ended front ink with committed ink", async ({
  page,
}, info) => {
  await open(page);
  await stroke(page, 250, 280);
  await ready(page);
  await page.mouse.move(250, 360);
  await page.mouse.down();
  await page.mouse.move(310, 368, { steps: 12 });
  await expect.poll(async () => (await inkBounds(page, clip)).maxY).toBeGreaterThan(165);
  const before = await inkBounds(page, clip);
  await holdFrames(page);
  await page.mouse.up();
  await drag(page, 700, 760, false);
  const moved = await inkBounds(page, clip);
  expect(moved.minX - before.minX).toBe(60);
  expect(moved.maxX - before.maxX).toBe(60);
  expect(moved.minY).toBe(before.minY);
  expect(moved.maxY).toBe(before.maxY);
  await page.screenshot({ path: info.outputPath("recent-ink-held.png") });
  const image = await page.screenshot({ clip });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await page.evaluate(() => document.dispatchEvent(new Event("test-release-frames")));
  await ready(page);
  expect((await page.screenshot({ clip })).equals(image)).toBe(true);
});
test("WMP-11 scheduling fixture retains original raster through offscreen re-pan and cancelled reversal", async ({
  page,
}, info) => {
  await open(page);
  await stroke(page, 250, 300);
  await ready(page);
  const original = await page.screenshot({ clip });
  await holdFrames(page);
  await drag(page, 200, 1600);
  expect((await inkBounds(page, clip)).maxX).toBe(-1);
  await drag(page, 900, -500, false);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await page.keyboard.press("Escape");
  expect((await inkBounds(page, clip)).maxX).toBe(-1);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await drag(page, 900, -500);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await page.screenshot({ path: info.outputPath("reversed-before-exact.png") });
  await page.evaluate(() => document.dispatchEvent(new Event("test-release-frames")));
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
});
