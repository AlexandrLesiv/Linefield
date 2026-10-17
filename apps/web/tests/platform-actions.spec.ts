import { test, expect } from "@playwright/test";
import type { Page, Locator } from "@playwright/test";
async function swipe(page: Page, tile: Locator, dx = -180, dy = 0) {
  const box = await tile.boundingBox();
  if (!box) throw Error("Missing tile");
  const x = box.x + box.width * 0.75;
  const y = box.y + 80;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 8 });
  await page.mouse.up();
}

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

test("WEB-P02 native context menu follows the pointer and clamps at edges", async ({ page }) => {
  await page.goto("/?platform=macos");
  await expect(page.locator(".more")).toHaveCount(0);
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  const box = await tile.boundingBox();
  if (!box) throw Error("Missing tile");
  const x = box.x + 30,
    y = box.y + 60;
  await page.mouse.click(x, y, { button: "right" });
  const menu = page.getByRole("menu");
  let bounds = await menu.boundingBox();
  expect(bounds?.x).toBeCloseTo(x, 0);
  expect(bounds?.y).toBeCloseTo(y, 0);
  await page.mouse.click(x - 15, y + 130, { button: "right" });
  bounds = await menu.boundingBox();
  expect(bounds?.x).toBeCloseTo(x - 15, 0);
  expect(bounds?.y).toBeCloseTo(y + 130, 0);
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 600 });
  await tile.dispatchEvent("contextmenu", { button: 2, clientX: 385, clientY: 595 });
  bounds = await menu.boundingBox();
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(382);
  expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(592);
});

for (const platform of ["ios", "android"]) {
  test(`WEB-P03 ${platform} reveals explicit swipe actions without long press`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/?platform=" + platform);
    await expect(page.locator(".more")).toHaveCount(0);
    const card = page.locator('[data-id="sample-0"]');
    const tile = card.locator(".drawing-tile");
    await tile.dispatchEvent("pointerdown", {
      button: 0,
      pointerId: 1,
      pointerType: "touch",
      clientX: 200,
      clientY: 200,
    });
    await page.waitForTimeout(650);
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(card).not.toHaveAttribute("data-swiped");
    await tile.dispatchEvent("pointercancel", { pointerId: 1 });
    await swipe(page, tile, -15, 90);
    await expect(card).not.toHaveAttribute("data-swiped");
    await swipe(page, tile);
    await expect(card).toHaveAttribute("data-swiped", "true");
    await expect(page.locator(".drawing-surface")).toHaveCount(0);
    await card.getByRole("button", { name: "Rename", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await tile.focus();
    await tile.press("ArrowLeft");
    await expect(card.getByRole("button", { name: "Rename", exact: true })).toBeFocused();
    await card.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(card.getByRole("button", { name: "Undo", exact: true })).toBeFocused();
    await card.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(card).not.toHaveClass(/removed/);
  });
}

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

test("WEB-P05 swipe rail cancels outside, in reverse, and never deletes on full swipe", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const card = page.locator('[data-id="sample-0"]');
  const tile = card.locator(".drawing-tile");
  await swipe(page, tile, -240);
  await expect(card).toHaveAttribute("data-swiped", "true");
  await expect(card).not.toHaveClass(/removed/);
  await swipe(page, tile, 70);
  await expect(card).not.toHaveAttribute("data-swiped");
  await swipe(page, tile);
  await page.mouse.click(3, 3);
  await expect(card).not.toHaveAttribute("data-swiped");
  await expect(card.locator(".swipe-actions")).toHaveAttribute("inert", "");
  await tile.focus();
  await tile.press("ArrowLeft");
  const second = page.locator('[data-id="sample-1"]');
  await second.locator(".drawing-tile").focus();
  await second.locator(".drawing-tile").press("ArrowLeft");
  await expect(card).not.toHaveAttribute("data-swiped");
  await expect(second).toHaveAttribute("data-swiped", "true");
  await page.keyboard.press("Escape");
  await expect(second).not.toHaveAttribute("data-swiped");
  await expect(second.locator(".drawing-tile")).toBeFocused();
});

test("WEB-P06 a held vertical drag never opens a drawing on release", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  const box = await tile.boundingBox();
  if (!box) throw Error("Missing tile");
  await page.mouse.move(box.x + 100, box.y + 70);
  await page.mouse.down();
  await page.mouse.move(box.x + 100, box.y + 150, { steps: 5 });
  await page.waitForTimeout(650);
  await page.mouse.up();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await tile.click();
  await expect(page.locator(".drawing-surface")).toBeVisible();
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
