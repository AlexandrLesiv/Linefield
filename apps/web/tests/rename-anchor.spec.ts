import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function openRename(page: Page, id = "sample-0") {
  const more = page.locator(`[data-id="${id}"] .more`);
  await more.focus();
  await more.press("Enter");
  const menu = page.getByRole("menu");
  await menu.evaluate((node) => node.getAnimations().forEach((motion) => motion.finish()));
  const source = await menu.boundingBox();
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  return source;
}

async function finishRename(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.evaluate((node) => node.getAnimations().forEach((motion) => motion.finish()));
  await expect.poll(() => dialog.evaluate((node) => node.getAnimations().length)).toBe(0);
  return dialog;
}

test("WEB-RA01 Rename retains the nearby menu corner after morph cleanup", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1200 });
  await page.goto("/");
  const source = await openRename(page);
  const dialog = await finishRename(page);
  const target = await dialog.boundingBox();
  expect(source).not.toBeNull();
  expect(target).not.toBeNull();
  if (!source || !target) throw Error("Missing menu/dialog bounds");
  const expectedX =
    source.x + source.width / 2 > 600 ? source.x + source.width - target.width : source.x;
  const expectedY =
    source.y + source.height / 2 > 600 ? source.y + source.height - target.height : source.y;
  expect(target.x).toBeCloseTo(Math.max(16, Math.min(expectedX, 1184 - target.width)), 0);
  expect(target.y).toBeCloseTo(Math.max(16, Math.min(expectedY, 1184 - target.height)), 0);
  expect(Math.abs(target.y - (1200 - target.height) / 2)).toBeGreaterThan(20);
  await page.getByLabel("Drawing name").fill("   ");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Enter a drawing name.");
  await expect(page.getByLabel("Drawing name")).toHaveValue("   ");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
});

test("WEB-RA02 Rename fits edges and repositions safely on viewport resize", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 500 });
  await page.goto("/");
  await openRename(page, "sample-5");
  const dialog = await finishRename(page);
  await page.setViewportSize({ width: 320, height: 280 });
  await expect
    .poll(async () => {
      const box = await dialog.boundingBox();
      return (
        !!box &&
        box.x >= 16 &&
        box.y >= 16 &&
        box.x + box.width <= 304.5 &&
        box.y + box.height <= 264.5
      );
    })
    .toBe(true);
  await page.getByLabel("Drawing name").fill("Near edge");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-5"] .drawing-tile')).toHaveAccessibleName(
    "Open Near edge",
  );
});

test("WEB-RA03 reduced motion and early save preserve anchoring and cleanup", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const source = await openRename(page);
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate((node) => node.getAnimations().length)).toBe(0);
  const target = await dialog.boundingBox();
  expect(Math.abs((target?.y ?? 0) - (source?.y ?? 0))).toBeLessThan(250);
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await openRename(page);
  await page.getByLabel("Drawing name").fill("Saved early");
  await page.getByLabel("Drawing name").press("Enter");
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 600, height: 400 });
  await expect(page.locator('[data-id="sample-0"] .drawing-tile')).toHaveAccessibleName(
    "Open Saved early",
  );
});

test("WEB-RA04 visual viewport keyboard bounds keep form and actions reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await openRename(page);
  const dialog = await finishRename(page);
  // Inject the browser viewport boundary; this is not a physical keyboard/device test.
  await page.evaluate(() => {
    const viewport = window.visualViewport;
    if (!viewport) throw Error("Visual viewport unavailable");
    Object.defineProperties(viewport, {
      height: { configurable: true, value: 290 },
      offsetTop: { configurable: true, value: 80 },
    });
    viewport.dispatchEvent(new Event("resize"));
  });
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  if (!box) throw Error("Missing dialog");
  expect(box.y).toBeGreaterThanOrEqual(96);
  expect(box.y + box.height).toBeLessThanOrEqual(354);
  await page.getByLabel("Drawing name").fill("Keyboard safe");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .drawing-tile')).toHaveAccessibleName(
    "Open Keyboard safe",
  );
});
