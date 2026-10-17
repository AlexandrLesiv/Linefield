import { test, expect } from "@playwright/test";

for (const locale of ["en-US", "uk-UA"]) {
  test(`WEB-H01 iPhone ${locale} compose action fits portrait and landscape with Back focus`, async ({
    browser,
  }) => {
    const context = await browser.newContext({ locale, viewport: { width: 320, height: 844 } });
    const page = await context.newPage();
    await page.goto("/?platform=ios");
    for (const width of [320, 844, 1280]) {
      await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
      const header = page.locator(".product-header");
      const create = page.locator(".iphone-create");
      const title = await header.locator("h1").boundingBox();
      const action = await create.boundingBox();
      const review = await page.locator(".preview-controls").boundingBox();
      if (!title || !action || !review) throw Error("Missing header");
      expect(action.x + action.width).toBe(width - 20);
      expect(action.width).toBe(56);
      expect(action.height).toBe(56);
      expect(action.x + action.width).toBeLessThanOrEqual(width);
      expect(review.y).toBeGreaterThanOrEqual(title.y + title.height);
      expect(action.y + action.height).toBe((width === 844 ? 390 : 844) - 16);
      await expect(create).toHaveText("");
      await expect(create.locator("svg")).toHaveAttribute("aria-hidden", "true");
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await expect(page.locator(".mobile-create, .new-tile")).toHaveCount(0);
      await create.click();
      await expect(page.locator(".back")).toBeFocused();
      await page.locator(".back").click();
      await expect(create).toBeFocused();
    }
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(page.locator(".iphone-create")).toBeInViewport();
    await expect(page.locator(".preview-controls")).not.toBeInViewport();
    await page.locator(".iphone-create").click();
    await expect(page.locator(".app-toolbar")).toHaveAttribute("inert", "");
    await page.locator(".back").click();
    await expect(page.locator(".iphone-create")).toBeFocused();
    await page.goForward();
    await expect(page.locator(".back")).toBeFocused();
    await page.goBack();
    await expect(page.locator(".iphone-create")).toBeFocused();
    await context.close();
  });
}

for (const platform of ["web", "ios", "ipados", "android"])
  for (const scheme of ["light", "dark"] as const) {
    test(`WEB-H02 ${platform} dialog ${scheme} Cancel and Rename show hover/pressed feedback`, async ({
      page,
    }) => {
      await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
      await page.goto(`/?platform=${platform}`);
      await page.locator('[data-id="sample-0"] .more').click();
      await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
      for (const label of ["Cancel", "Rename"]) {
        const control = page
          .locator(".dialog-actions")
          .getByRole("button", { name: label, exact: true });
        await page.mouse.move(0, 0);
        const initial = await control.evaluate((node) => getComputedStyle(node).backgroundColor);
        await control.hover();
        const hover = await control.evaluate((node) => getComputedStyle(node).backgroundColor);
        expect(hover).not.toBe(initial);
        await page.mouse.down();
        const pressed = await control.evaluate((node) => getComputedStyle(node).backgroundColor);
        expect(pressed).not.toBe(hover);
        await page.mouse.move(0, 0);
        await page.mouse.up();
        await expect(page.locator(".rename-dialog")).toBeVisible();
        expect((await control.boundingBox())?.height).toBeGreaterThanOrEqual(44);
      }
      await page.getByLabel("Drawing name").focus();
      await page.keyboard.press("Tab");
      await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeFocused();
      expect(
        await page.evaluate(() => document.activeElement?.closest(".rename-dialog") !== null),
      ).toBe(true);
    });
  }
