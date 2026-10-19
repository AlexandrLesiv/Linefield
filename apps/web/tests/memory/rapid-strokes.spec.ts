import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const clip = { x: 100, y: 200, width: 600, height: 350 };
async function ready(page: Page) {
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
}
async function open(page: Page) {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
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
async function releaseFrames(page: Page) {
  await page.evaluate(() => document.dispatchEvent(new Event("test-release-frames")));
  await ready(page);
}
async function stroke(page: Page, y: number) {
  await page.mouse.move(200, y);
  await page.mouse.down();
  await page.mouse.move(500, y, { steps: 5 });
  await page.mouse.up();
}
test("WMP-01/03 scheduling fixture accepts three real strokes before content presentation", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const blank = await page.screenshot({ clip });
  await holdFrames(page);
  for (const y of [260, 330, 400]) await stroke(page, y);
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "updating");
  await releaseFrames(page);
  const ink = await page.screenshot({ clip });
  expect(ink.equals(blank)).toBe(false);
  await page.screenshot({ path: info.outputPath("rapid-three.png") });
  await page.locator("[data-memory-diagnostics]").click();
  const diagnostics = JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
  expect(
    diagnostics.input.records.filter(
      (record: { reason: string; outcome: string }) =>
        record.reason === "end" && record.outcome === "ok",
    ),
  ).toHaveLength(3);
  for (let i = 0; i < 3; i++) {
    await expect(page.locator("[data-memory-undo]")).toBeEnabled();
    await page.locator("[data-memory-undo]").click();
    await ready(page);
  }
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
  for (let i = 0; i < 3; i++) {
    await page.locator("[data-memory-redo]").click();
    await ready(page);
  }
  expect((await page.screenshot({ clip })).equals(ink)).toBe(true);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(ink)).toBe(true);
});
test("WMP-02/03 scheduling fixture cancels B while A remains uncached and preserves A", async ({
  page,
}) => {
  await open(page);
  const blank = await page.screenshot({ clip });
  await holdFrames(page);
  await stroke(page, 260);
  await page.mouse.move(200, 330);
  await page.mouse.down();
  await page.mouse.move(500, 330, { steps: 5 });
  await expect(page.locator("[data-memory-width]")).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await releaseFrames(page);
  const ink = await page.screenshot({ clip });
  expect(ink.equals(blank)).toBe(false);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await page.locator("[data-memory-redo]").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(ink)).toBe(true);
});
