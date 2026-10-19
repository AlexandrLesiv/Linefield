import { test, expect } from "@playwright/test";
import { ready, rotationClick } from "./rotation-helpers.ts";
for (const locale of ["en-US", "uk-UA"]) {
  test(`WMP-06 I18N rotation ${locale}320 enlarged night disclosure and controls stay reachable`, async ({
    browser,
  }, info) => {
    const context = await browser.newContext({
      locale,
      viewport: { width: 320, height: 700 },
      colorScheme: "dark",
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:65144/");
    await page.locator(".mobile-create").click();
    await ready(page);
    for (let i = 0; i < 12; i++) await rotationClick(page, "right");
    await ready(page);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await ready(page);
    const notice = page.locator("#memory-disclosure");
    const phrase = locale === "uk-UA" ? "Не збережено" : "Not saved";
    const visible = await notice.evaluate((node, prefix) => {
      const text = [...node.childNodes].find((child) => child.nodeType === Node.TEXT_NODE)!;
      const range = document.createRange();
      range.setStart(text, 0);
      range.setEnd(text, prefix.length);
      const line = range.getBoundingClientRect();
      const footer = node.parentElement!.getBoundingClientRect();
      const box = node.getBoundingClientRect();
      return {
        top: line.top,
        bottom: line.bottom,
        height: line.height,
        footerTop: footer.top,
        footerBottom: footer.bottom,
        footerHeight: footer.height,
        boxTop: box.top,
        boxBottom: box.bottom,
      };
    }, phrase);
    expect(visible.height).toBeGreaterThan(20);
    expect(visible.top).toBeGreaterThanOrEqual(Math.max(visible.footerTop, visible.boxTop));
    expect(visible.bottom).toBeLessThanOrEqual(Math.min(visible.footerBottom, visible.boxBottom));
    expect(visible.footerHeight).toBeLessThanOrEqual(700 * 0.33 + 1);
    await page.screenshot({ path: info.outputPath(`${locale}-rotation-disclosure-night.png`) });
    await notice.focus();
    for (const control of await page.locator("[data-memory-rotation]").all()) {
      await page.keyboard.press("Tab");
      await expect(control).toBeFocused();
      const shape = await control.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const footer = node.closest(".canvas-footer")!.getBoundingClientRect();
        return {
          x: box.x,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
          scroll: node.scrollWidth,
          client: node.clientWidth,
          footerTop: footer.top,
          footerBottom: footer.bottom,
        };
      });
      expect(shape.width).toBeGreaterThanOrEqual(44);
      expect(shape.height).toBeGreaterThanOrEqual(44);
      expect(shape.x).toBeGreaterThanOrEqual(56);
      expect(shape.right).toBeLessThanOrEqual(320);
      expect(shape.scroll).toBeLessThanOrEqual(shape.client);
      expect(shape.top).toBeGreaterThanOrEqual(shape.footerTop);
      expect(shape.bottom).toBeLessThanOrEqual(shape.footerBottom);
      if ((await control.getAttribute("data-memory-rotation")) === "reset") {
        await expect(control).toHaveText("-180°");
        await page.screenshot({
          path: info.outputPath(`${locale}-rotation-reset-focus-night.png`),
        });
      }
    }
    await context.close();
  });
}
