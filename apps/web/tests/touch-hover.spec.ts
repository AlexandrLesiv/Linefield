import { test, expect, webkit } from "@playwright/test";

for (const scheme of ["light", "dark"] as const) {
  test(`WEB-TH01 New drawing has subtle hover elevation without geometry changes in ${scheme}`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/");
    const tile = page.locator(".new-cell > .new-tile");
    const bounds = await tile.boundingBox();
    await expect(tile).toHaveCSS("box-shadow", "none");
    await tile.hover();
    const shadow = await tile.evaluate((node) => getComputedStyle(node).boxShadow);
    expect(shadow).not.toBe("none");
    await expect(tile).toHaveCSS("border-style", "dashed");
    expect(await tile.boundingBox()).toEqual(bounds);
    await page.locator(".drawing-card").first().hover();
    await expect(tile).toHaveCSS("box-shadow", "none");
    await expect(page.locator(".drawing-card").first()).toHaveCSS("box-shadow", shadow);
    await tile.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(tile).toBeFocused();
    await expect(tile).toHaveCSS("outline-style", "solid");
    await expect(tile).toHaveCSS("outline-width", "3px");
  });
}

test("WEB-TH02 WebKit touch feedback has no browser highlight or sticky hover shadow", async () => {
  const browser = await webkit.launch({ headless: true, channel: "" });
  try {
    const context = await browser.newContext({
      hasTouch: true,
      viewport: { width: 840, height: 900 },
    });
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:65142/?preview=1");
    const tile = page.locator(".new-cell > .new-tile");
    for (const control of [
      tile,
      page.locator(".drawing-tile").first(),
      page.locator(".more").first(),
      page.locator("select"),
    ]) {
      await expect(control).toHaveCSS("-webkit-tap-highlight-color", "rgba(0, 0, 0, 0)");
    }
    await tile.hover();
    await expect(tile).toHaveCSS("box-shadow", "none");
    await tile.tap();
    await expect(page.locator(".back")).toBeFocused();
    await expect(page.locator(".back")).toHaveCSS(
      "-webkit-tap-highlight-color",
      "rgba(0, 0, 0, 0)",
    );
    await page.locator(".back").tap();
    await expect(tile).toBeVisible();
    await expect(tile).toHaveCSS("box-shadow", "none");
  } finally {
    await browser.close();
  }
});
