import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function ready(page: Page) {
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-memory-width]")).toBeEnabled();
}
async function stroke(page: Page, y: number) {
  await page.mouse.move(250, y);
  await page.mouse.down();
  await page.mouse.move(500, y, { steps: 12 });
  await page.mouse.up();
  await ready(page);
}
async function image(page: Page) {
  return page.screenshot({ clip: { x: 100, y: 200, width: 600, height: 350 } });
}
test("WMP-01/02/03/10 manual pen draws, cancels, undoes and retains across Back", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  const blank = await image(page);
  await stroke(page, 300);
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  const ink = await image(page);
  expect(ink.equals(blank)).toBe(false);
  await page.screenshot({ path: info.outputPath("desktop-ink.png") });
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  expect((await image(page)).equals(blank)).toBe(true);
  await page.locator("[data-memory-redo]").click();
  await ready(page);
  expect((await image(page)).equals(ink)).toBe(true);
  await page.mouse.move(250, 400);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 12 });
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await ready(page);
  expect((await image(page)).equals(ink)).toBe(true);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await ready(page);
  expect((await image(page)).equals(ink)).toBe(true);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  expect((await image(page)).equals(blank)).toBe(true);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await ready(page);
  await expect(page.locator("[data-memory-redo]")).toBeEnabled();
  expect(errors).toEqual([]);
});
test("WMP-02/06 manual settings, remap cancellation and Ukrainian narrow screen", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  const width = page.locator("[data-memory-width]");
  await width.focus();
  await page.keyboard.press("Home");
  for (let i = 0; i < 23; i++) await page.keyboard.press("ArrowRight");
  await expect(width).toHaveValue("24");
  await page.locator("[data-memory-color]").fill("#cc2244");
  await stroke(page, 320);
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  await page.screenshot({ path: info.outputPath("settings-colored-ink.png") });
  await page.mouse.move(250, 400);
  await page.mouse.down();
  await page.mouse.move(500, 400, { steps: 8 });
  await page.setViewportSize({ width: 1100, height: 800 });
  await page.mouse.up();
  await ready(page);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await page.screenshot({ path: info.outputPath("settings.png") });
});
test.describe("Ukrainian compact", () => {
  test.use({ locale: "uk-UA", viewport: { width: 390, height: 844 } });
  test("WMP-06 actual localized ink", async ({ page }, info) => {
    await page.goto("/");
    await page.locator(".mobile-create").click();
    await ready(page);
    await page.mouse.move(140, 300);
    await page.mouse.down();
    await page.mouse.move(300, 360, { steps: 12 });
    await page.mouse.up();
    await ready(page);
    await expect(page.locator("[data-memory-undo]")).toBeEnabled();
    await expect(page.locator(".canvas-notice")).toContainText("Довгі штрихи");
    await page.screenshot({ path: info.outputPath("uk-compact-ink.png") });
  });
});
