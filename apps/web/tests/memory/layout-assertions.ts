import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
export async function settleSurface(page: Page): Promise<void> {
  await page.locator(".drawing-surface").evaluate(async (node) => {
    await Promise.all(node.getAnimations().map((animation) => animation.finished.catch(() => {})));
  });
}
export async function assertFoundationBounds(page: Page): Promise<void> {
  const bounds = await page.evaluate(() => {
    const rect = (selector: string) => {
      const node = document.querySelector(selector);
      if (!(node instanceof HTMLElement)) throw Error(selector);
      const box = node.getBoundingClientRect();
      return {
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        client: node.clientWidth,
        scroll: node.scrollWidth,
      };
    };
    return {
      back: rect(".back"),
      title: rect(".canvas-title"),
      footer: rect(".canvas-footer"),
      disclosure: rect("#memory-disclosure"),
      status: rect("#memory-status"),
    };
  });
  expect(bounds.back.right).toBeLessThanOrEqual(bounds.title.left);
  expect(bounds.footer.bottom - bounds.footer.top).toBeLessThanOrEqual(
    (page.viewportSize()?.height ?? 0) / 3 + 1,
  );
  expect(bounds.disclosure.scroll).toBeLessThanOrEqual(bounds.disclosure.client + 1);
  if (await page.locator("#memory-status").isVisible()) {
    expect(bounds.status.bottom).toBeLessThanOrEqual(bounds.footer.top);
    const retry = page.getByRole("button", { name: "Повторити спробу", exact: true });
    const action = await retry.boundingBox();
    expect(action).not.toBeNull();
    if (action) expect(action.y + action.height).toBeLessThanOrEqual(bounds.footer.top);
    expect(await retry.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  }
}
