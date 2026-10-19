import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const clip = { x: 100, y: 200, width: 650, height: 350 };
async function ready(page: Page) {
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
}
async function open(page: Page) {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(450, 350, { steps: 8 });
  await page.mouse.up();
  await ready(page);
}
async function pan(page: Page, finish: boolean) {
  await page.locator("[data-memory-canvas]").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(550, 450);
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 5 });
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "updating");
  if (finish) {
    await page.mouse.up();
    await page.keyboard.up("Space");
    await ready(page);
  }
}
test("WMP-11 actual arrows, zoom and drag retain coherent artwork and viewport across Back", async ({
  page,
}, info) => {
  await open(page);
  const original = await page.screenshot({ clip });
  await page.keyboard.press("ArrowRight");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(false);
  await page.keyboard.press("ArrowLeft");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await page.locator('[data-memory-zoom="in"]').click();
  await ready(page);
  await expect(page.locator("[data-memory-zoom-value]")).toHaveText("125%");
  expect((await page.screenshot({ clip })).equals(original)).toBe(false);
  await page.locator('[data-memory-zoom="out"]').click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await pan(page, true);
  const moved = await page.screenshot({ clip });
  expect(moved.equals(original)).toBe(false);
  await page.screenshot({ path: info.outputPath("panned.png") });
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(moved)).toBe(true);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
});
test("WMP-11 pan Escape restores pre-view, Space-up held pointer cannot become ink", async ({
  page,
}) => {
  await open(page);
  const original = await page.screenshot({ clip });
  await pan(page, false);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await expect(page.locator('[data-memory-zoom="in"]')).toBeDisabled();
  await page.keyboard.press("Escape");
  await ready(page);
  await page.mouse.up();
  await page.keyboard.up("Space");
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await pan(page, false);
  await page.keyboard.up("Space");
  await ready(page);
  const panned = await page.screenshot({ clip });
  await page.mouse.move(650, 550, { steps: 4 });
  await page.mouse.move(20, 20);
  await page.mouse.up();
  expect((await page.screenshot({ clip })).equals(panned)).toBe(true);
  await page.mouse.move(500, 300);
  await page.mouse.down();
  await page.mouse.move(600, 300, { steps: 4 });
  await page.mouse.up();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(panned)).toBe(false);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(panned)).toBe(true);
});
test("WMP-11 active ink rejects held navigation without replay after End", async ({ page }) => {
  await open(page);
  await page.mouse.move(500, 300);
  await page.mouse.down();
  await page.keyboard.down("Space");
  await page.keyboard.down("ArrowRight");
  await page.mouse.move(600, 300, { steps: 4 });
  await page.mouse.up();
  await ready(page);
  const ended = await page.screenshot({ clip });
  await page.keyboard.down("ArrowRight");
  await page.keyboard.down("Space");
  await page.mouse.move(550, 450);
  await page.mouse.down();
  await page.mouse.move(600, 500, { steps: 3 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("ArrowRight");
  await page.keyboard.up("Space");
  expect((await page.screenshot({ clip })).equals(ended)).toBe(true);
});
