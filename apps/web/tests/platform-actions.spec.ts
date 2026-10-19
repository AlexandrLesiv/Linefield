import { test, expect } from "@playwright/test";
test("WEB-P01 desktop has three centered moderate cards, adapting to two and one", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1800, height: 1000 });
  await page.goto("/");
  const boxes = await page.locator(".drawing-grid > *").evaluateAll((nodes) =>
    nodes.map((node) => {
      const b = node.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width };
    }),
  );
  expect(boxes[0]?.width).toBe(420);
  expect(boxes[0]?.y).toBe(boxes[2]?.y);
  expect(boxes[3]?.y).toBeGreaterThan(boxes[0]?.y ?? 0);
  expect((boxes[0]?.x ?? 0) + (boxes[2]?.x ?? 0) + 420).toBe(1800);
  for (const [width, columns] of [
    [900, 2],
    [390, 1],
  ]) {
    await page.setViewportSize({ width: width!, height: 900 });
    const count = await page
      .locator(".drawing-grid")
      .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").length);
    expect(count).toBe(columns);
  }
});

test("WEB-P04 menus animate opacity and geometry without filter blur", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-id="sample-0"] .more').focus();
  await page.locator('[data-id="sample-0"] .more').press("Enter");
  const filters = await page
    .getByRole("menu")
    .evaluate((node) =>
      node
        .getAnimations({ subtree: true })
        .flatMap((animation) =>
          animation.effect instanceof KeyframeEffect
            ? animation.effect.getKeyframes().map((frame) => frame.filter)
            : [],
        ),
    );
  expect(filters.every((value) => value === undefined || value === "none")).toBe(true);
});

test("WEB-P07 cancelled touch does not consume the next keyboard activation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  await tile.dispatchEvent("pointerdown", { button: 0, pointerId: 1, pointerType: "touch" });
  await tile.dispatchEvent("pointercancel", { pointerId: 1 });
  await tile.focus();
  await tile.press("Enter");
  await expect(page.locator(".drawing-surface")).toBeVisible();
});
