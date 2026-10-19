import { test, expect } from "@playwright/test";
for (const locale of ["en-US", "uk-UA"]) {
  for (const [width, height] of [
    [1280, 900],
    [320, 700],
    [740, 320],
  ] as const) {
    test(`WMR-05 ${locale} ${width}x${height} foundation and retained gallery`, async ({
      browser,
    }, info) => {
      const context = await browser.newContext({
        locale,
        viewport: { width, height },
        colorScheme: "dark",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      try {
        await page.goto("/");
        await page.locator(width < 640 ? ".mobile-create" : ".new-tile").click();
        const canvas = page.locator("[data-memory-canvas]");
        await expect(canvas).toHaveAttribute("data-state", "ready");
        await expect(page.locator(".back")).toBeFocused();
        await expect(canvas).toHaveCSS("background-color", "rgb(255, 255, 255)");
        await expect(
          page.getByRole("button", {
            name: locale === "uk-UA" ? "Повторити спробу" : "Retry",
            exact: true,
          }),
        ).toBeHidden();
        await expect(page.locator(".canvas-notice")).toContainText(
          locale === "uk-UA" ? "Не збережено" : "Not saved",
        );
        expect(
          await page
            .locator(".canvas-notice")
            .evaluate((node) => node.getBoundingClientRect().height <= innerHeight / 3 + 1),
        ).toBe(true);
        await page.screenshot({ path: info.outputPath("foundation.png") });
        await page.locator(".back").click();
        const resume = page.locator(width < 640 ? ".mobile-create" : ".new-tile");
        await expect(resume).toHaveAccessibleName(
          locale === "uk-UA" ? "Продовжити тимчасовий малюнок" : "Resume temporary drawing",
        );
        await expect(resume.locator("svg")).toHaveCount(1);
        expect(
          await resume.evaluate((node) => {
            const rect = node.getBoundingClientRect();
            return rect.width <= innerWidth && rect.height >= 44;
          }),
        ).toBe(true);
        await page.screenshot({ path: info.outputPath("retained-gallery.png") });
      } finally {
        await context.close();
      }
    });
  }
}
