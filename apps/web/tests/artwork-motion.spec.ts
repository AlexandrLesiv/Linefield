import { test, expect } from "@playwright/test";
import type { Locator } from "@playwright/test";

async function sample(node: Locator, time: number) {
  return node.evaluate((surface, at) => {
    surface.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = at;
    });
    const rect = surface.getBoundingClientRect();
    const image = surface.querySelector("img")?.getBoundingClientRect();
    return { shell: rect.toJSON(), image: image?.toJSON() };
  }, time);
}

function sameRect(actual: DOMRect, expected: DOMRect): void {
  for (const key of ["x", "y", "width", "height"] as const)
    expect(Math.abs(actual[key] - expected[key])).toBeLessThan(0.5);
}

for (const width of [1100, 390]) {
  test(`WEB-M01 artwork matches whole-card handoff at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const card = page.locator('[data-id="sample-2"]');
    await card.scrollIntoViewIfNeeded();
    await card.locator("img").evaluate((image) => {
      if (!(image instanceof HTMLImageElement)) throw Error("Expected artwork image");
      return image.decode();
    });
    const before = await card.evaluate((node) => ({
      shell: node.getBoundingClientRect().toJSON(),
      image: node.querySelector("img")!.getBoundingClientRect().toJSON(),
    }));
    await card.locator(".drawing-tile").click();
    const surface = page.locator(".drawing-surface");
    const initial = await sample(surface, 0);
    sameRect(initial.shell, before.shell);
    sameRect(initial.image, before.image);
    await expect(card).toHaveCSS("visibility", "hidden");
    const middle = await sample(surface, 180);
    const final = await sample(surface, 359.99);
    expect(middle.image.width).toBeGreaterThan(initial.image.width);
    expect(middle.image.width).toBeLessThan(final.image.width);
    sameRect(final.image, final.shell);
    await surface.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(page.locator(".back")).toBeFocused();
    await page.locator(".back").click();
    const target = await card.evaluate((node) => ({
      shell: node.getBoundingClientRect().toJSON(),
      image: node.querySelector("img")!.getBoundingClientRect().toJSON(),
    }));
    const last = await sample(surface, 359.99);
    sameRect(last.shell, target.shell);
    sameRect(last.image, target.image);
    await expect(card).toHaveCSS("visibility", "hidden");
    await surface.evaluate((node) =>
      node.getAnimations({ subtree: true }).forEach((a) => a.finish()),
    );
    await expect(surface).toHaveCount(0);
    const staticImage = await card
      .locator("img")
      .evaluate((node) => node.getBoundingClientRect().toJSON());
    sameRect(last.image, staticImage);
    await expect(card).toHaveCSS("visibility", "visible");
  });
}

test("WEB-M02 interrupted close and resize restore the current artwork layout", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.locator('[data-id="sample-0"]');
  await card.locator(".drawing-tile").click();
  const surface = page.locator(".drawing-surface");
  await sample(surface, 150);
  await page.goBack();
  await sample(surface, 180);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(surface).toHaveCount(0);
  await expect(card).toHaveCSS("visibility", "visible");
  await expect(card.locator(".drawing-tile")).toBeFocused();
  await card.locator(".drawing-tile").click();
  sameRect(
    (await sample(surface, 0)).image,
    await card.locator("img").evaluate((node) => node.getBoundingClientRect().toJSON()),
  );
});

test("WEB-M03 iPhone compose is a round safe-area control with final-card clearance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const create = page.getByRole("button", { name: "New drawing", exact: true });
  await expect(create).toHaveText("");
  await expect(create.locator('svg[aria-hidden="true"]')).toBeVisible();
  expect((await create.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator(".mobile-actions, .mobile-create, .new-tile")).toHaveCount(0);
  await expect(page.locator(".drawing-grid")).toHaveCSS("padding-bottom", "88px");
  await create.click();
  await expect(page.locator(".canvas-title")).toHaveText("Untitled");
});
