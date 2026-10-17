import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

async function menu(page: Page) {
  await page.locator('[data-id="sample-0"] .more').focus();
  await page.keyboard.press("Enter");
  await page.locator(".gallery-menu").evaluate((node) => {
    node.getAnimations({ subtree: true }).forEach((animation) => animation.finish());
  });
  await page.locator(".action-backdrop").evaluate((node) => {
    node.getAnimations().forEach((animation) => animation.finish());
    node.dataset.identity = "original";
  });
}
for (const colorScheme of ["light", "dark"] as const) {
  test(`WEB-BD01 ${colorScheme} menu hands same scrim to Rename and fades on Cancel`, async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto("/");
    await menu(page);
    const backdrop = page.locator(".action-backdrop");
    await expect(backdrop).toHaveCSS("background-color", "rgba(0, 0, 0, 0.333)");
    await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
    await expect(backdrop).toHaveAttribute("data-identity", "original");
    expect(await backdrop.evaluate((node) => Number(getComputedStyle(node).opacity))).toBe(1);
    await expect(page.locator(".rename-dialog")).toBeVisible();
    expect(
      await page
        .locator(".rename-dialog")
        .evaluate((node) => getComputedStyle(node, "::backdrop").backgroundColor),
    ).toBe("rgba(0, 0, 0, 0)");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    const midway = await backdrop.evaluate((node) => {
      node.getAnimations().forEach((animation) => {
        animation.pause();
        animation.currentTime = 130;
      });
      return Number(getComputedStyle(node).opacity);
    });
    expect(midway).toBeGreaterThan(0);
    expect(midway).toBeLessThan(1);
    await backdrop.evaluate((node) =>
      node.getAnimations().forEach((animation) => animation.finish()),
    );
    await expect(backdrop).toHaveCount(0);
    await expect(page.locator(".rename-dialog")).toHaveCount(0);
  });
}

test("WEB-BD02 outside dismissal consumes press; Delete releases scrim and Undo restores", async ({
  page,
}) => {
  await page.goto("/");
  await menu(page);
  const other = await page.locator('[data-id="sample-1"] .drawing-tile').boundingBox();
  if (!other) throw Error("Missing tile");
  await page.mouse.click(other.x + 30, other.y + 30);
  await expect(page.locator(".gallery-menu")).toHaveCount(0);
  await expect(page.locator(".action-backdrop")).toHaveCount(0);
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await menu(page);
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(page.locator(".action-backdrop")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator('[data-id="sample-0"] .removal')).toHaveCount(0);
});

test("WEB-BD03 reduced motion and resize settle dismissal without orphan overlays", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await menu(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(".action-backdrop")).toHaveCount(0);
  await menu(page);
  await page.setViewportSize({ width: 1000, height: 800 });
  await expect(page.locator(".action-backdrop")).toHaveCount(0);
  await menu(page);
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await page.getByLabel("Drawing name").fill("Saved name");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.locator(".action-backdrop")).toHaveCount(0);
});

test("WEB-BD04 native right-click retargets another card without replacing the scrim", async ({
  page,
}) => {
  await page.goto("/?platform=macos");
  const first = page.locator('[data-id="sample-0"] .drawing-tile');
  await first.click({ button: "right", position: { x: 30, y: 30 } });
  await page.locator(".action-backdrop").evaluate((node) => {
    node.dataset.identity = "retarget";
  });
  const other = await page.locator('[data-id="sample-1"] .drawing-tile').boundingBox();
  if (!other) throw Error("Missing second drawing");
  await page.mouse.click(other.x + 40, other.y + 40, { button: "right" });
  await expect(page.locator(".action-backdrop")).toHaveAttribute("data-identity", "retarget");
  await expect(page.getByRole("menu")).toHaveCount(1);
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  await expect(page.getByLabel("Drawing name")).toHaveValue("Morning objects");
  await page.keyboard.press("Escape");
  await expect(page.locator(".action-backdrop")).toHaveCount(0);
});
