import { test, expect } from "@playwright/test";

for (const scheme of ["light", "dark"] as const) {
  test(`WEB-H02 web dialog ${scheme} Cancel and Rename show hover/pressed feedback`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme, reducedMotion: "reduce" });
    await page.goto("/");
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
