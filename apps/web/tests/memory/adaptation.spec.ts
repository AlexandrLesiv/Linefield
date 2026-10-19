import { test, expect } from "@playwright/test";
import { assertFoundationBounds, settleSurface } from "./layout-assertions.ts";
test("WMR-03 zero-size suspension and resumed size preserve the empty owner", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.locator(".new-tile").click();
  const canvas = page.locator("[data-memory-canvas]");
  await expect(canvas).toHaveAttribute("data-state", "ready");
  await canvas.evaluate((node) => {
    if (node instanceof HTMLElement) node.style.width = "0px";
  });
  await expect(canvas).toHaveAttribute("data-state", "sizeUnavailable");
  await canvas.evaluate((node) => {
    if (node instanceof HTMLElement) node.style.width = "";
  });
  await expect(canvas).toHaveAttribute("data-state", "ready");
  await canvas.evaluate((node) => {
    if (node instanceof HTMLElement) node.style.width = "9000px";
  });
  await expect(canvas).toHaveAttribute("data-state", "sizeUnavailable");
  await canvas.evaluate((node) => {
    if (node instanceof HTMLElement) node.style.width = "";
  });
  await expect(canvas).toHaveAttribute("data-state", "ready");
});
for (const [width, height] of [
  [320, 700],
  [740, 320],
] as const) {
  test(`WMR-05 enlarged Ukrainian ${width}x${height} error and retained gallery remain reachable`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      locale: "uk-UA",
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    let fail = true;
    await page.route("**/*linefield_web_memory*.wasm", async (route) => {
      if (fail) await route.abort();
      else await route.continue();
    });
    try {
      await page.goto("/");
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "32px";
      });
      await page.locator(width < 640 ? ".mobile-create" : ".new-tile").click();
      await expect(page.locator("[data-memory-canvas]")).toHaveAttribute(
        "data-state",
        "loadFailed",
      );
      const retry = page.getByRole("button", { name: "Повторити спробу", exact: true });
      await retry.focus();
      await expect(retry).toBeInViewport();
      await settleSurface(page);
      await assertFoundationBounds(page);
      const status = page.locator("#memory-status");
      await status.focus();
      await page.keyboard.press("End");
      await expect
        .poll(() =>
          status.evaluate((node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 1),
        )
        .toBe(true);
      await page.keyboard.press("Home");
      await page.screenshot({ path: info.outputPath("enlarged-failure.png") });
      fail = false;
      await retry.click();
      await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
      await page.locator(".canvas-notice").focus();
      await assertFoundationBounds(page);
      const disclosure = page.locator("#memory-disclosure");
      await page.keyboard.press("End");
      await expect
        .poll(() =>
          disclosure.evaluate(
            (node) => node.scrollTop + node.clientHeight >= node.scrollHeight - 1,
          ),
        )
        .toBe(true);
      await page.keyboard.press("Home");
      await page.screenshot({ path: info.outputPath("enlarged-ready.png") });
      await page.locator(".back").click();
      await expect(page.locator(".drawing-surface")).toHaveCount(0);
      await page.locator(".drawing-card:last-child .more").focus();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const covered = await page.locator(".drawing-card:last-child .more").evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return (
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) !== node
        );
      });
      expect(covered).toBe(false);
      if (width < 640) {
        const disclosureBottom = await page.locator(".prototype-label").evaluate((node) => {
          const range = document.createRange();
          range.selectNodeContents(node);
          return range.getBoundingClientRect().bottom;
        });
        const action = await page.locator(".mobile-create").boundingBox();
        expect(action).not.toBeNull();
        if (action) expect(disclosureBottom).toBeLessThanOrEqual(action.y);
      }
      await page.screenshot({ path: info.outputPath("enlarged-gallery-bottom.png") });
    } finally {
      await context.close();
    }
  });
}
