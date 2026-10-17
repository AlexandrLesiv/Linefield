import { test, expect } from "@playwright/test";

test("WEB-F01 iPhone uses round compose; iPad toolbar and Android FAB remain", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  await expect(page.locator(".iphone-create")).toBeVisible();
  const toolbar = page.getByRole("toolbar", { name: "Drawing actions" });
  await expect(toolbar).toHaveCount(0);
  await page.getByLabel("Preview platform").selectOption("ipados");
  await expect(page.locator(".iphone-create")).toBeHidden();
  await expect(toolbar).toBeVisible();
  const bounds = await toolbar.boundingBox();
  expect(bounds?.x).toBe(0);
  expect(bounds?.width).toBe(390);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBe(844);
  await expect(toolbar.locator(".mobile-create")).toHaveCSS("position", "static");
  await page.getByLabel("Preview platform").selectOption("android");
  await expect(toolbar).toHaveCount(0);
  await expect(page.locator(".mobile-create")).toHaveCSS("position", "fixed");
});

test("WEB-F02 pointer hover is a soft shadow without an outline or size change", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  await expect(card).toBeVisible();
  const before = await card.boundingBox();
  await card.hover();
  await expect(card).toHaveCSS("outline-style", "none");
  await expect(card).not.toHaveCSS("box-shadow", "none");
  expect(await card.boundingBox()).toEqual(before);
  await page.keyboard.press("Tab");
  await card.locator(".drawing-tile").focus();
  await expect(card.locator(".drawing-tile")).toHaveCSS("outline-style", "solid");
});

test("WEB-F03 Delete morphs to live Undo and crossfades the same card", async ({ page }) => {
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  await card.locator(".more").focus();
  await card.locator(".more").press("Enter");
  const menu = page.getByRole("menu");
  await menu.evaluate((node) => node.getAnimations({ subtree: true }).forEach((a) => a.finish()));
  const cardBefore = await card.boundingBox();
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const closing = page.locator(".gallery-menu");
  await closing.evaluate((node) => {
    const fade = node.getAnimations()[0];
    if (!fade) throw Error("Missing committed-action morph");
    fade.pause();
    fade.currentTime = 295;
  });
  const during = await closing.boundingBox();
  const target = await card.getByRole("button", { name: "Undo" }).boundingBox();
  expect(during?.x).toBeCloseTo(target?.x ?? 0, 0);
  expect(during?.y).toBeCloseTo(target?.y ?? 0, 0);
  expect(during?.width).toBeCloseTo(target?.width ?? 0, 0);
  expect(during?.height).toBeCloseTo(target?.height ?? 0, 0);
  expect(await card.boundingBox()).toEqual(cardBefore);
  await expect(card.getByRole("button", { name: "Undo" })).toBeFocused();
  await card.getByRole("button", { name: "Undo" }).click();
  await expect(closing).toHaveCount(0);
  await expect(card.locator(".deletion-visual")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Actions for Coastal house" })).toBeFocused();
});

test("WEB-F04 reduced motion commits Delete without transitional surfaces", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  await card.locator(".more").focus();
  await card.locator(".more").press("Enter");
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.locator(".gallery-menu,.deletion-visual")).toHaveCount(0);
  await expect(card.getByRole("button", { name: "Undo" })).toBeFocused();
});
