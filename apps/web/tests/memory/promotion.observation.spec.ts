import { complete, clear } from "./observed-frame.ts";
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const clip = { x: 200, y: 220, width: 750, height: 450 };
async function hold(page: Page, enabled: boolean) {
  await page.evaluate((value) => {
    document.documentElement.dataset.holdGpu = `${value}`;
  }, enabled);
}
async function stroke(page: Page) {
  await page.mouse.move(300, 300);
  await page.mouse.down();
  await page.mouse.move(650, 400, { steps: 24 });
  await page.mouse.up();
}
async function pan(page: Page) {
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(400, 500);
  await page.mouse.down();
  await page.mouse.move(500, 550, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Space");
}
test("MIG-WORKER-11 End then pan before promotion uses Rust-issued frame identity", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const wait = WebGL2RenderingContext.prototype.clientWaitSync;
    WebGL2RenderingContext.prototype.clientWaitSync = function (sync, flags, timeout) {
      if (document.documentElement.dataset.holdGpu === "true") return this.TIMEOUT_EXPIRED;
      return wait.call(this, sync, flags, timeout);
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await clear(page);
  await stroke(page);
  await complete(page);
  const original = await page.screenshot({ clip });
  await clear(page);
  await pan(page);
  await complete(page);
  const translated = await page.screenshot({ clip });
  expect(translated.equals(original)).toBe(false);
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  await clear(page);
  await hold(page, true);
  await stroke(page);
  await pan(page);
  await hold(page, false);
  await complete(page);
  await expect.poll(async () => (await page.screenshot({ clip })).equals(translated)).toBe(true);
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
  await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
  await clear(page);
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await complete(page);
  await clear(page);
  await page.getByRole("button", { name: "Redo last action", exact: true }).click();
  await complete(page, true);
  await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
});
