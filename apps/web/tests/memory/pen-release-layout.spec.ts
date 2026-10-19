import { test, expect } from "@playwright/test";
import { setup, freeze, penEvent, ready } from "./pending-pen.ts";
test("WMP-02 I18N-UK-002 enlarged uk320 pending pen keeps explanation and exits reachable", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    locale: "uk-UA",
    viewport: { width: 320, height: 700 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const cdp = await setup(page, context, true);
    await freeze(page, cdp);
    const notice = page.locator("[data-memory-pending-release]");
    await expect(notice).toContainText("Escape");
    await page.screenshot({ path: info.outputPath("uk320-pending.png") });
    const bounds = await notice.evaluate((node) => {
      const text = document.createRange();
      text.setStart(node.firstChild!, 0);
      text.setEnd(node.firstChild!, node.textContent!.trimEnd().length);
      const rect = text.getBoundingClientRect();
      const parent = node.parentElement!.getBoundingClientRect();
      return {
        top: rect.top,
        bottom: rect.bottom,
        parentTop: parent.top,
        parentBottom: parent.bottom,
      };
    });
    expect(bounds.top).toBeGreaterThanOrEqual(bounds.parentTop - 1);
    expect(bounds.bottom).toBeLessThanOrEqual(bounds.parentBottom + 1);
    await expect(page.locator(".back")).toBeInViewport();
    await page.keyboard.press("Escape");
    await penEvent(cdp, "mouseReleased", 0);
    await ready(page);
    await expect(notice).toBeHidden();
    await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  } finally {
    await context.close();
  }
});
