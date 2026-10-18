import { test, expect } from "@playwright/test";

test("WEB-G09 Back/Forward during collapse converges to the latest route", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open Coastal house" }).click();
  await expect(page.locator(".back")).toBeFocused();
  await page.goBack();
  await page.locator(".drawing-surface").evaluate((node) => {
    node.getAnimations().forEach((a) => a.pause());
  });
  await page.goForward();
  await page.locator(".drawing-surface").evaluate((node) => {
    node.getAnimations().forEach((a) => a.finish());
  });
  await expect(page.locator(".back")).toBeFocused();
  await expect(page).toHaveURL(/\/drawing\/sample-0$/);
  await expect(page.locator(".drawing-surface")).toHaveCount(1);
  await page.goBack();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
});

test("WEB-G11 malformed history routes are inert", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.evaluate(() => {
    history.pushState(null, "", "/drawing/%22%5D");
    dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("WEB-G13 menu keeps source title visible and dismisses with animation", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Actions for Coastal house" });
  await trigger.focus();
  await trigger.press("Enter");
  await page.mouse.move(0, 0);
  const title = page.locator('[data-id="sample-0"] .drawing-name');
  await expect(title).toHaveCSS("opacity", "1");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});
