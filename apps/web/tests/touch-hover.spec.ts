import { testOrigin } from "./origin.ts";
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
    await page.goto(`${testOrigin}/?preview=1`);
    const tile = page.locator(".new-cell > .new-tile");
    for (const control of [
      tile,
      page.locator(".drawing-tile").first(),
      page.locator(".more").first(),
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
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator(".more").first().tap();
    await page.getByRole("menuitem", { name: "Rename", exact: true }).tap();
    await expect(page.getByLabel("Drawing name")).toBeFocused();
    const dialog = await page.getByRole("dialog").boundingBox();
    expect(dialog?.x).toBeGreaterThanOrEqual(0);
    expect((dialog?.x ?? 0) + (dialog?.width ?? 0)).toBeLessThanOrEqual(390);
    await page.getByRole("button", { name: "Cancel", exact: true }).tap();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator(".more").first()).toBeFocused();
  } finally {
    await browser.close();
  }
});
