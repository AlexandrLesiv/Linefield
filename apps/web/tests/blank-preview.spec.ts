import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`WEB-N01 ${width}px blank previews never add or reorder gallery tiles`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const cards = page.locator(".drawing-card");
    const before = await cards.evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-id")),
    );
    const create = page.locator(width >= 640 ? ".new-tile" : ".mobile-create");
    for (let index = 0; index < 2; index++) {
      await create.click();
      await expect(page.locator(".back")).toBeFocused();
      await expect(page.locator(".canvas-title")).toHaveText("Untitled");
      await expect(cards).toHaveCount(6);
      await page.locator(".back").click();
      await expect(page.locator(".drawing-surface")).toHaveCount(0);
      await expect(create).toBeFocused();
      expect(
        await cards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-id"))),
      ).toEqual(before);
    }
  });
}

test("WEB-N02 blank preview history remains transient through Forward and interruption", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await expect(page.locator(".back")).toBeFocused();
  await page.goBack();
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.pause()));
  await page.goForward();
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  await expect(page.locator(".back")).toBeFocused();
  await expect(page).toHaveURL(/\/drawing\/preview-new$/);
  await expect(page.locator(".drawing-card")).toHaveCount(6);
  await page.goBack();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toBeFocused();
  await page.goForward();
  await expect(page.locator(".back")).toBeFocused();
  await page.reload();
  await expect(page.locator(".back")).toBeFocused();
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await expect(page.locator(".drawing-card")).toHaveCount(6);
});

test("WEB-N03 reduced motion preview creates no tile in an empty gallery", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (let index = 0; index < 6; index++) {
    await page.locator(`[data-id="sample-${index}"] .more`).click();
    await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  }
  await page.locator(".new-tile").click();
  await expect(page.locator(".back")).toBeFocused();
  await page.locator(".back").click();
  await expect(page.locator(".drawing-card")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await page.locator(".back").click();
  await expect(page.locator(".drawing-card")).toHaveCount(0);
  await expect(page.locator(".new-tile")).toBeFocused();
});
