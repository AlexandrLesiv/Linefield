import { test, expect } from "@playwright/test";
import en from "../../../shared/localization/generated/web/en.json" with { type: "json" };
import uk from "../../../shared/localization/generated/web/uk.json" with { type: "json" };

test("WEB-R01 locale catalogues have stable matching IDs and placeholders", () => {
  expect(Object.keys(uk).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(key).toMatch(/^[a-z]+\.[a-zA-Z]+$/);
    expect(uk[key].match(/\{\w+\}/g) ?? []).toEqual(en[key].match(/\{\w+\}/g) ?? []);
    expect(uk[key].length).toBeGreaterThan(0);
  }
});

test("WEB-R02 web leaves context menu and long press to browser", async ({ page }) => {
  await page.goto("/?preview=1");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  const prevented = await tile.evaluate((node) => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    node.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(prevented).toBe(false);
  await tile.dispatchEvent("pointerdown", {
    pointerType: "touch",
    button: 0,
    clientX: 20,
    clientY: 20,
  });
  // Exceed the native-preview long-press threshold to detect an unwanted web handler.
  await page.waitForTimeout(650);
  await tile.dispatchEvent("pointerup");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await page.getByLabel("Preview platform").selectOption("macos");
  await tile.dispatchEvent("contextmenu");
  await expect(page.getByRole("menu")).toBeVisible();
});

test("WEB-R03 Rename starts at menu bounds, survives immediate Escape, and preserves literal names", async ({
  page,
}) => {
  await page.goto("/");
  const more = page.locator('[data-id="sample-0"] .more');
  await more.focus();
  await more.press("Enter");
  const menu = page.getByRole("menu");
  await menu.evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  const bounds = await menu.boundingBox();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.evaluate((node) => {
    const animation = node.getAnimations()[0];
    if (!animation) throw Error("Missing Rename continuity animation");
    animation.pause();
    animation.currentTime = 0;
  });
  const start = await dialog.boundingBox();
  expect(start?.width).toBeCloseTo(bounds?.width ?? -1, 0);
  expect(start?.x).toBeCloseTo(bounds?.x ?? -1, 0);
  await expect(menu).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"]')).toHaveAttribute("data-renaming", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
  await more.focus();
  await more.press("Enter");
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await page.getByLabel("Drawing name").fill("$& <example>");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.locator('[data-id="sample-0"] .drawing-tile')).toHaveAccessibleName(
    "Open $& <example>",
  );
});

test("WEB-R04 overflow, dialog and drawing navigation preserve gallery geometry", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 420 });
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  await expect(card).toBeVisible();
  const before = await card.boundingBox();
  await card.locator(".more").focus();
  await card.locator(".more").press("Enter");
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  const during = await card.boundingBox();
  expect(during?.width).toBe(before?.width);
  expect(during?.x).toBe(before?.x);
  await page.keyboard.press("Escape");
  await card.locator(".drawing-tile").click();
  await expect(page.locator(".back")).toBeFocused();
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  const after = await card.boundingBox();
  expect(after?.width).toBe(before?.width);
  expect(after?.x).toBe(before?.x);
});

test("WEB-R05 desktop minmax tiles stay bounded; New uses a subtle dashed border", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  await expect(card).toBeVisible();
  const bounds = await card.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(220);
  expect(bounds?.width).toBeLessThanOrEqual(420);
  await expect(page.locator(".new-tile")).toHaveCSS("border-top-style", "dashed");
});
