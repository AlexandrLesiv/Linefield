import { expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
export async function traverseDisabled(page: Page, control: Locator) {
  for (let i = 0; i < 40; i++) {
    if (await control.evaluate((element) => element === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(control).toBeFocused();
  await expect(control).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Tab");
  await expect(control).not.toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(control).toBeFocused();
}
