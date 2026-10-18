import { expect, test } from "@playwright/test";

const legacyQueries = [
  "",
  "preview=1",
  "preview=0",
  "platform=unknown",
  "review=gallery",
  ...[
    "web",
    "macos",
    "windows",
    "linux",
    "ios",
    "ipados",
    "android",
    "chromeos",
    "watchos",
    "wearos",
    "tvos",
    "android-tv",
    "visionos",
    "android-xr",
  ].map((platform) => `platform=${platform}`),
];

test("WEB-ONE01 every legacy query retains Web capabilities without review controls", async ({
  page,
}) => {
  for (const query of legacyQueries) {
    await page.goto(query ? `/?${query}` : "/");
    await expect(page.locator("html")).not.toHaveAttribute("data-platform");
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.locator(".preview-controls,.iphone-create,.swipe-actions")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reset samples" })).toHaveCount(0);
    await expect(page.getByText("Browser simulation", { exact: true })).toHaveCount(0);
    await expect(page.locator(".more")).toHaveCount(6);
    await expect(page.locator(".new-tile")).toBeVisible();
    await page.locator('[data-id="sample-0"] .more').focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeVisible();
    await expect(page.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
  }
});

test("WEB-ONE01 old viewer links allow transient New and preserve ordinary history", async ({
  page,
}) => {
  await page.goto("/?platform=watchos&preview=1");
  const original = page.url();
  await page.keyboard.press("Tab");
  await expect(page.locator(".new-tile")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator(".back")).toBeFocused();
  await expect(page).toHaveURL(/\/drawing\/preview-new\?platform=watchos&preview=1$/);
  await page.reload();
  await expect(page.locator(".back")).toBeFocused();
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  expect(page.url()).toBe(original);
  await expect(page.locator(".new-tile")).toBeFocused();
  await page.goForward();
  await expect(page.locator(".back")).toBeFocused();
  await page.goBack();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".preview-controls")).toHaveCount(0);
  await expect(page.locator(".drawing-card")).toHaveCount(6);
});

test("WEB-ONE02 legacy native links never intercept browser context menu or long press", async ({
  page,
}) => {
  for (const platform of ["macos", "ios", "android"]) {
    await page.goto(`/?platform=${platform}`);
    const tile = page.locator('[data-id="sample-0"] .drawing-tile');
    expect(
      await tile.evaluate((node) => {
        const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
        node.dispatchEvent(event);
        return event.defaultPrevented;
      }),
    ).toBe(false);
    await tile.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1, button: 0 });
    await page.waitForTimeout(650);
    await tile.dispatchEvent("pointercancel", { pointerId: 1 });
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(page.locator(".swipe-actions")).toHaveCount(0);
    await tile.focus();
    await tile.press("Enter");
    await expect(page.locator(".back")).toBeFocused();
  }
});
