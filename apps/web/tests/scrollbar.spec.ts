import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 420 });
  await page.goto("/");
});
test("WEB-SC01 overlay does not reserve space and follows native scrolling", async ({ page }) => {
  const bar = page.getByRole("scrollbar");
  await expect(bar).toBeVisible();
  const geometry = () =>
    page.locator("html").evaluate((node) => ({
      width: node.clientWidth,
      viewport: innerWidth,
      gutter: getComputedStyle(node).scrollbarGutter,
      card: document.querySelector(".drawing-card")?.getBoundingClientRect().width,
    }));
  const before = await geometry();
  expect(before.width).toBe(before.viewport);
  expect(before.gutter).toBe("auto");
  await page.mouse.wheel(0, 180);
  await expect.poll(() => bar.getAttribute("aria-valuenow")).not.toBe("0");
  expect(await geometry()).toEqual(before);
  await page.locator(".drawing-grid").evaluate((node) => {
    node.replaceChildren();
  });
  await expect(bar).toBeHidden();
  expect((await geometry()).width).toBe(before.width);
});
test("WEB-SC02 overlay thumb supports drag, keyboard, and track paging", async ({ page }) => {
  const bar = page.getByRole("scrollbar");
  await expect(bar).toBeVisible();
  const bounds = await bar.boundingBox();
  if (!bounds) throw Error("Scrollbar must have bounds");
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2 + 80);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  await bar.focus();
  await bar.press("End");
  await expect
    .poll(async () => Number(await bar.getAttribute("aria-valuenow")))
    .toBe(Number(await bar.getAttribute("aria-valuemax")));
  await bar.press("Home");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await bar.press("PageDown");
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
  await bar.press("Home");
  await page.locator("[data-overlay-track]").click({ position: { x: 1, y: 400 } });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(100);
});
test("WEB-SC03 hides behind navigation and dialogs, survives resize and forced colors", async ({
  page,
}) => {
  const bar = page.getByRole("scrollbar");
  await page.getByRole("button", { name: "Open Coastal house" }).click();
  await expect(bar).toBeHidden();
  await page.getByRole("button", { name: "← Back" }).click();
  await expect(bar).toBeVisible();
  await page.locator('[data-id="sample-0"] .more').focus();
  await page.locator('[data-id="sample-0"] .more').press("Enter");
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(bar).toBeHidden();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(bar).toBeVisible();
  await page.setViewportSize({ width: 420, height: 600 });
  await page.emulateMedia({ forcedColors: "active" });
  await expect(bar).toBeVisible();
  expect(await bar.evaluate((node) => getComputedStyle(node).forcedColorAdjust)).toBe("none");
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(420);
});
