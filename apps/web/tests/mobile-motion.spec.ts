import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function rail(page: Page) {
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  await tile.focus();
  await tile.press("ArrowLeft");
  await expect(page.locator('[data-id="sample-0"]')).toHaveAttribute("data-swiped", "true");
  await page
    .locator('[data-id="sample-0"] .drawing-tile')
    .evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
}
for (const platform of ["ios", "android"]) {
  test(`WEB-MM01 ${platform} Delete slides from swipe position and Undo reverses same slot`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/?platform=${platform}`);
    await rail(page);
    const original = await page.locator('[data-id="sample-0"]').boundingBox();
    const state = await page.locator('[data-id="sample-0"] .delete').evaluate((node) => {
      if (!(node instanceof HTMLElement)) throw Error("Invalid delete");
      node.click();
      const card = document.querySelector<HTMLElement>('[data-id="sample-0"]');
      const ghost = card?.querySelector<HTMLElement>("[data-mobile-slide]");
      if (!card || !ghost) throw Error("Missing slide");
      ghost.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = 0;
      });
      const artwork = ghost.querySelector<HTMLElement>(".drawing-tile") ?? ghost;
      const start = artwork.getBoundingClientRect().left - card.getBoundingClientRect().left;
      ghost.getAnimations().forEach((animation) => {
        animation.currentTime = 100;
      });
      const midway = artwork.getBoundingClientRect().left - card.getBoundingClientRect().left;
      card.querySelector<HTMLButtonElement>(".undo")?.click();
      const replacement = document.querySelector<HTMLElement>('[data-id="sample-0"]');
      const incoming = replacement?.querySelector<HTMLElement>("[data-mobile-slide]");
      if (!incoming || !replacement) throw Error("Missing reversal");
      incoming.getAnimations({ subtree: true }).forEach((animation) => {
        animation.pause();
        animation.currentTime = 0;
      });
      return {
        start,
        midway,
        reversed:
          (incoming.querySelector<HTMLElement>(".drawing-tile") ?? incoming).getBoundingClientRect()
            .left - replacement.getBoundingClientRect().left,
      };
    });
    expect(state.start).toBeCloseTo(-160, 0);
    expect(state.midway).toBeLessThan(state.start);
    expect(state.reversed).toBeCloseTo(state.midway, 3);
    expect(await page.locator('[data-id="sample-0"]').boundingBox()).toEqual(original);
    await expect(page.locator('[data-id="sample-0"] .drawing-tile').first()).toBeFocused();
    await page.evaluate(() =>
      document
        .querySelector("[data-mobile-slide]")
        ?.getAnimations()
        .forEach((animation) => animation.finish()),
    );
    await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
    await expect(page.locator('[data-id="sample-0"] .drawing-tile')).toBeVisible();
    await expect(page.locator(".more")).toHaveCount(0);
  });
}

test("WEB-MM02 mobile Rename retracts rail and fades without geometry morph", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  await rail(page);
  await page.locator('[data-id="sample-0"] .rename').click();
  await expect(page.locator('[data-id="sample-0"]')).not.toHaveAttribute("data-swiped");
  const geometry = await page.locator(".rename-dialog").evaluate((node) => {
    const animation = node.getAnimations()[0];
    if (!animation) throw Error("Missing fade");
    animation.pause();
    animation.currentTime = 0;
    const start = node.getBoundingClientRect().toJSON();
    animation.currentTime = 100;
    return {
      start,
      end: node.getBoundingClientRect().toJSON(),
      frames: animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes() : [],
    };
  });
  expect(geometry.start).toEqual(geometry.end);
  expect(geometry.frames?.every((frame) => !("width" in frame) && !("transform" in frame))).toBe(
    true,
  );
  await page.getByLabel("Drawing name").fill("Mobile renamed");
  await page.locator(".rename-dialog").getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.locator(".rename-dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Mobile renamed" })).toBeFocused();
});

test("WEB-MM03 reduced mobile motion and resize clean transient slides", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=android");
  await rail(page);
  await page.locator('[data-id="sample-0"] .delete').click();
  await page.setViewportSize({ width: 420, height: 800 });
  await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
  await rail(page);
  await page.locator('[data-id="sample-0"] .delete').click();
  await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo" })).toBeFocused();
});

test("WEB-MM04 incoming artwork keeps live focus and next activation opens drawing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  await rail(page);
  await page.locator('[data-id="sample-0"] .delete').click();
  await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).evaluate((node) => {
    if (!(node instanceof HTMLElement)) throw Error("Invalid Undo");
    node.click();
    document
      .querySelector("[data-mobile-slide]")
      ?.getAnimations()
      .forEach((animation) => animation.pause());
  });
  await expect(page.getByRole("button", { name: "Open Coastal house" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect.poll(() => new URL(page.url()).pathname).toBe("/drawing/sample-0");
  await expect(page.locator("[data-mobile-slide]")).toHaveCount(0);
});

test("WEB-MM05 outside Rename dismissal only fades and returns tile focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=android");
  await rail(page);
  await page.locator('[data-id="sample-0"] .rename').click();
  await page
    .locator(".rename-dialog")
    .evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
  await page.mouse.click(2, 2);
  await expect(page.locator(".rename-dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Open Coastal house" })).toBeFocused();
  await expect(page.locator(".more")).toHaveCount(0);
});
