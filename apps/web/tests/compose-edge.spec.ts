import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function prepare(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?preview=1");
  await page.getByLabel("Preview platform").selectOption("ios");
}
async function frame(page: Page, time: number) {
  return page.locator(".drawing-surface").evaluate((surface, at) => {
    surface.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = at;
    });
    const edge = surface.querySelector(".compose-edge");
    if (!edge) throw Error("Missing compose perimeter");
    const style = getComputedStyle(edge);
    return {
      opacity: Number(style.opacity),
      color: style.borderColor,
      border: style.borderWidth,
      radius: getComputedStyle(surface).borderRadius,
      shellBorder: getComputedStyle(surface).borderWidth,
      width: surface.getBoundingClientRect().width,
    };
  }, time);
}
async function finish(page: Page) {
  await page
    .locator(".drawing-surface")
    .evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((animation) => animation.finish()),
    );
}
for (const scheme of ["light", "dark"] as const) {
  test(`WEB-CE01 compose perimeter separates moving paper in ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await prepare(page);
    const create = page.locator(".iphone-create");
    const color = await create.evaluate((node) => getComputedStyle(node).borderColor);
    await create.click();
    expect((await frame(page, 0)).opacity).toBe(1);
    const opening = await frame(page, 180);
    expect(opening.color).toBe(color);
    expect(opening.border).toBe("1px");
    expect(opening.shellBorder).toBe("0px");
    expect(opening.opacity).toBe(1);
    await finish(page);
    await expect(page.locator(".compose-edge")).toHaveCSS("opacity", "0");
    await page.locator(".back").click();
    expect((await frame(page, 0)).opacity).toBe(0);
    expect((await frame(page, 30)).opacity).toBe(1);
    await frame(page, 150);
    await page.screenshot({
      path: `quality/web-typed-catalogs/compose-${scheme}-collapse.png`,
    });
    expect((await frame(page, 359)).opacity).toBe(1);
    await finish(page);
    await expect(page.locator(".drawing-surface")).toHaveCount(0);
    await expect(create).toBeVisible();
    await expect(page.locator(".drawing-card")).toHaveCount(6);
  });
}

test("WEB-CE02 interrupted opening preserves the perimeter and corner geometry", async ({
  page,
}) => {
  await prepare(page);
  await page.locator(".iphone-create").click();
  const before = await frame(page, 310);
  await page.goBack();
  const after = await frame(page, 0);
  expect(after.opacity).toBeCloseTo(before.opacity, 3);
  expect(after.radius).toBe(before.radius);
  expect(after.width).toBeCloseTo(before.width, 1);
  await finish(page);
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
});

test("WEB-CE03 resize and reduced motion settle without a viewport border", async ({ page }) => {
  await prepare(page);
  await page.locator(".iphone-create").click();
  await frame(page, 100);
  await page.setViewportSize({ width: 410, height: 844 });
  await expect(page.locator(".compose-edge")).toHaveCSS("opacity", "0");
  await page.locator(".back").click();
  await frame(page, 100);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".iphone-create").click();
  await expect(page.locator(".compose-edge")).toHaveCSS("opacity", "0");
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
});

test("WEB-CE04 forced colors retains a real perimeter; drawing tiles do not gain one", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await prepare(page);
  await page.locator(".iphone-create").click();
  expect((await frame(page, 150)).border).toBe("1px");
  await finish(page);
  await page.locator(".back").click();
  await finish(page);
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".drawing-tile").first().click();
  await expect(page.locator(".compose-edge")).toHaveCount(0);
});
