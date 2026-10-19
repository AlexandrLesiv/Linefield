import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { inkBounds } from "./pixel-bounds.ts";
const clip = { x: 100, y: 200, width: 1000, height: 450 };
const ready = (page: Page) =>
  expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
test("WP01 sole worker, real ink and continuous pan with exact-frame adoption", async ({
  page,
}, info) => {
  const workers: string[] = [];
  page.on("worker", (w) => workers.push(w.url()));
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  expect((await inkBounds(page, clip)).maxX).toBe(-1);
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 30 });
  await page.mouse.up();
  await ready(page);
  const before = await inkBounds(page, clip);
  expect(before.maxX).toBeGreaterThan(300);
  await page.keyboard.down("Space");
  await page.mouse.move(700, 500);
  await page.mouse.down();
  await page.mouse.move(760, 530, { steps: 4 });
  await expect.poll(async () => (await inkBounds(page, clip)).minX).toBe(before.minX + 60);
  await expect.poll(async () => (await inkBounds(page, clip)).minY).toBe(before.minY + 30);
  await ready(page);
  const held = await page.screenshot({ clip });
  await page.screenshot({ path: info.outputPath("held-pan.png") });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(held)).toBe(true);
  await page.screenshot({ path: info.outputPath("settled-pan.png") });
  expect(workers).toHaveLength(1);
  expect(
    await page.evaluate(
      () =>
        performance
          .getEntriesByType("resource")
          .filter((e) => e.name.includes("canvaskit") && e.name.endsWith(".wasm")).length,
    ),
  ).toBe(0);
});
