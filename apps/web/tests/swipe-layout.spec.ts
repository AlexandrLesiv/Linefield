import { test, expect } from "@playwright/test";

test("WEB-SL01 drag follows finger before release; cancel settles without deleting", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  const card = page.locator('[data-id="sample-0"]');
  const tile = card.locator(".drawing-tile");
  const bounds = await tile.boundingBox();
  if (!bounds) throw Error("Missing tile");
  await page.mouse.move(bounds.x + 240, bounds.y + 90);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 195, bounds.y + 90);
  expect((await tile.boundingBox())?.x).toBeCloseTo(bounds.x - 45, 0);
  await page.mouse.move(bounds.x + 145, bounds.y + 90);
  expect((await tile.boundingBox())?.x).toBeCloseTo(bounds.x - 95, 0);
  await tile.dispatchEvent("pointercancel", { pointerId: 1 });
  await page.mouse.up();
  await expect(card).not.toHaveAttribute("data-swiped");
  await expect(card).not.toHaveClass(/removed/);
});

test("WEB-SL02 iPad always has ellipsis; phone controls track actual grid columns in place", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ipados");
  await expect(page.locator(".more")).toHaveCount(6);
  await expect(page.locator(".swipe-actions")).toHaveCount(0);
  await page.getByLabel("Preview platform").selectOption("ios");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  await tile.evaluate((node) => node.setAttribute("data-preserved-node", "true"));
  await tile.focus();
  await expect(page.locator(".more")).toHaveCount(0);
  await page.setViewportSize({ width: 1100, height: 844 });
  await expect(page.locator(".more")).toHaveCount(6);
  await expect(tile).toHaveAttribute("data-preserved-node", "true");
  await expect(tile).toBeFocused();
  await page.locator('[data-id="sample-0"] .more').focus();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".more")).toHaveCount(0);
  await expect(tile).toBeFocused();
});

test("WEB-SL03 resize preserves open Rename and navigation origin", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=android");
  const tile = page.locator('[data-id="sample-0"] .drawing-tile');
  await tile.focus();
  await tile.press("ArrowLeft");
  await page.locator('[data-id="sample-0"] .rename').click();
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
  await expect(page.locator(".more")).toHaveCount(0);
});

test("WEB-SL04 Delete first frame retains rail and artwork, then moves gently together", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?platform=ios");
  await page.locator('[data-id="sample-0"] .drawing-tile').focus();
  await page.keyboard.press("ArrowLeft");
  const card = page.locator('[data-id="sample-0"]');
  await card
    .locator(".drawing-tile")
    .evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
  const state = await card.evaluate((node) => {
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    const rail = node.querySelector(".swipe-actions");
    const art = node.querySelector(".drawing-tile");
    if (!rail || !art) throw Error("Missing original layers");
    const before = { rail: rect(rail), art: rect(art) };
    node.querySelector<HTMLButtonElement>(".delete")?.click();
    const ghost = document.querySelector<HTMLElement>("[data-mobile-slide]");
    const ghostRail = ghost?.querySelector(".swipe-actions");
    const ghostArt = ghost?.querySelector(".drawing-tile");
    if (!ghost || !ghostRail || !ghostArt) throw Error("Missing outgoing layers");
    ghost.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const first = { rail: rect(ghostRail), art: rect(ghostArt) };
    ghost.getAnimations().forEach((animation) => {
      animation.currentTime = 80;
    });
    return {
      before,
      first,
      traveled: first.art.x - rect(ghostArt).x,
      width: ghost.getBoundingClientRect().width,
    };
  });
  expect(state.first).toEqual(state.before);
  expect(state.traveled).toBeGreaterThan(0);
  expect(state.traveled).toBeLessThan(state.width * 0.5);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeFocused();
});
