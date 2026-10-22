import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const clip = { x: 200, y: 220, width: 750, height: 450 };
async function open(page: Page, usePacked = false) {
  await page.addInitScript((packed) => {
    const wait = WebGL2RenderingContext.prototype.clientWaitSync;
    WebGL2RenderingContext.prototype.clientWaitSync = function (sync, flags, timeout) {
      if (document.documentElement.dataset.holdGpu === "true") return this.TIMEOUT_EXPIRED;
      return wait.call(this, sync, flags, timeout);
    };
    if (packed) {
      const storage = WebGL2RenderingContext.prototype.texStorage2D;
      WebGL2RenderingContext.prototype.texStorage2D = function (
        target,
        levels,
        format,
        width,
        height,
      ) {
        if (format === this.R8 || format === this.RGB8) throw Error("injected-format");
        return storage.call(this, target, levels, format, width, height);
      };
    }
  }, usePacked);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
}
async function hold(page: Page, holdEnabled: boolean) {
  await page.evaluate((enabled) => {
    document.documentElement.dataset.holdGpu = `${enabled}`;
  }, holdEnabled);
}
async function stroke(page: Page, a: [number, number], b: [number, number]) {
  await page.mouse.move(...a);
  await page.mouse.down();
  await page.mouse.move(...b, { steps: 24 });
  await page.mouse.up();
}
for (const packed of [false, true]) {
  test(`MIG-WORKER-08 crossing colored pending groups preserve MAX ownership (${packed ? "packed" : "R8"})`, async ({
    page,
  }) => {
    await open(page, packed);
    await stroke(page, [500, 250], [500, 600]);
    await page.locator('input[type="color"]').fill("#ff0000");
    await stroke(page, [250, 350], [850, 450]);
    const expected = await page.screenshot({ clip });
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await page.locator('input[type="color"]').fill("#000000");
    await hold(page, true);
    await stroke(page, [500, 250], [500, 600]);
    await page.locator('input[type="color"]').fill("#ff0000");
    await page.mouse.move(250, 350);
    await page.mouse.down();
    await page.mouse.move(850, 450, { steps: 24 });
    await hold(page, false);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(expected)).toBe(true);
    await page.mouse.up();
    await expect.poll(async () => (await page.screenshot({ clip })).equals(expected)).toBe(true);
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  });
}
test("MIG-WORKER-09 Undo cancels an awaiting promotion without GPU failure or receipt leak", async ({
  page,
}) => {
  await open(page);
  const blank = await page.screenshot({ clip });
  for (let i = 0; i < 10; i++) {
    await hold(page, true);
    await stroke(page, [300, 300], [650, 400]);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await hold(page, false);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  }
  await stroke(page, [300, 400], [650, 500]);
  expect((await page.screenshot({ clip })).equals(blank)).toBe(false);
});
test("MIG-WORKER-10 completed fences survive a simulated long scheduling gap", async ({ page }) => {
  await page.addInitScript(() => {
    const now = performance.now.bind(performance);
    Object.defineProperty(performance, "now", {
      value: () => now() + Number(document.documentElement.dataset.clockGap ?? 0),
    });
    const wait = WebGL2RenderingContext.prototype.clientWaitSync;
    WebGL2RenderingContext.prototype.clientWaitSync = function (sync, flags, timeout) {
      if (document.documentElement.dataset.clockGap === "12000") {
        document.documentElement.dataset.clockGap = "12001";
        return this.ALREADY_SIGNALED;
      }
      return wait.call(this, sync, flags, timeout);
    };
  });
  await open(page);
  await stroke(page, [300, 300], [650, 400]);
  const expected = await page.screenshot({ clip });
  await page.evaluate(() => {
    document.documentElement.dataset.clockGap = "12000";
  });
  await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
  await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(expected)).toBe(true);
  await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
  await page.getByRole("button", { name: "Undo last action", exact: true }).click();
  await expect.poll(async () => (await page.screenshot({ clip })).equals(expected)).toBe(false);
});
