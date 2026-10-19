import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export const ready = (page: Page) =>
  expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
export async function open(page: Page) {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  const box = await page.locator("[data-memory-canvas]").boundingBox();
  if (!box) throw Error("canvas absent");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
export async function stroke(page: Page, x: number, y: number, dx = 36, dy = 12) {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}
export async function holdFrames(page: Page) {
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
export const releaseFrames = (page: Page) =>
  page.evaluate(() => document.dispatchEvent(new Event("test-release-frames")));
export async function rotationClick(page: Page, direction: "left" | "right" | "reset") {
  const box = await page.locator(`[data-memory-rotation="${direction}"]`).boundingBox();
  if (!box) throw Error("rotation control absent");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

export async function diagnostics(page: Page): Promise<{
  render: {
    pendingMs: number;
    snapshotCount: number;
    peakImages: number;
    panPreviewPublications: number;
    maxPanTranslateMs: number;
    live: Record<string, number>;
  };
}> {
  const box = await page.locator("[data-memory-diagnostics]").boundingBox();
  if (!box) throw Error("diagnostics control absent");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return JSON.parse(await page.evaluate(() => navigator.clipboard.readText()));
}
