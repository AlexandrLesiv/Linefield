import { test, expect } from "@playwright/test";

test("WEB-ONE04 resize preserves open Rename and navigation origin", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=android");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  await page.locator('[data-id="sample-0"] .more').click();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await page.getByLabel("Drawing name").fill("Still editing");
  await page.setViewportSize({ width: 1100, height: 844 });
  await expect(page.getByLabel("Drawing name")).toHaveValue("Still editing");
  await expect(page.getByLabel("Drawing name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator(".more")).toHaveCount(6);
  await tile.click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(tile).toBeFocused();
  await expect(page.locator(".more")).toHaveCount(6);
});

test("WEB-ONE03 responsive breakpoints preserve live cards, focus and Web controls", async ({
  page,
}) => {
  await page.goto("/?platform=ios");
  const more = page.locator('[data-id="sample-0"] .more');
  await more.evaluate((node) => node.setAttribute("data-original", "true"));
  await more.focus();
  for (const [width, columns] of [
    [960, 3],
    [959, 2],
    [640, 2],
    [639, 1],
    [320, 1],
    [1280, 3],
  ]) {
    await page.setViewportSize({ width: width!, height: 844 });
    await expect(more).toHaveAttribute("data-original", "true");
    await expect(more).toBeFocused();
    await expect(page.locator(".more")).toHaveCount(6);
    const count = await page
      .locator(".drawing-grid")
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
    expect(count).toBe(columns);
    await expect(page.locator(width! < 640 ? ".mobile-create" : ".new-tile")).toBeVisible();
    await expect(page.locator(width! < 640 ? ".new-tile" : ".mobile-create")).toBeHidden();
    expect(
      await page
        .locator(".drawing-card")
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-id"))),
    ).toEqual(Array.from({ length: 6 }, (_, index) => `sample-${index}`));
  }
});

for (const locale of ["en-US", "uk-UA"]) {
  test(`WEB-ONE02 ${locale} narrow touch uses visible ellipsis and keyboard menu actions`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      locale,
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.goto("/?platform=android");
    const card = page.locator('[data-id="sample-0"]');
    const more = card.locator(".more");
    await expect(more).toHaveCSS("opacity", "1");
    await more.tap();
    const items = page.getByRole("menuitem");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("End");
    await expect(items.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(items.first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.locator(".rename-dialog input").fill("<test> Довга назва малюнка 🖊️");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(card.locator(".drawing-name")).toHaveText("<test> Довга назва малюнка 🖊️");
    await more.tap();
    await page.keyboard.press("ArrowDown");
    await expect(items.last()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(card.locator(".undo")).toBeFocused();
    await card.locator(".undo").tap();
    await expect(more).toBeFocused();
    await expect(page.locator(".swipe-actions")).toHaveCount(0);
    await more.tap();
    await page.keyboard.press("Escape");
    await expect(more).toBeFocused();
    await context.close();
  });
}

test("WEB-ONE03 narrow empty gallery has one centered New tile without floating duplicate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?platform=tvos");
  for (let index = 0; index < 6; index++) {
    await page.locator(`[data-id="sample-${index}"] .more`).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  }
  await page.locator(".mobile-create").click();
  await page.locator(".back").click();
  await expect(page.locator(".drawing-card")).toHaveCount(0);
  await expect(page.locator(".mobile-create")).toBeHidden();
  const tile = page.locator(".new-tile");
  await expect(tile).toBeVisible();
  const bounds = await tile.boundingBox();
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0) / 2).toBeCloseTo(195, 0);
  await tile.click();
  await page.locator(".back").click();
  await expect(tile).toBeFocused();
});
