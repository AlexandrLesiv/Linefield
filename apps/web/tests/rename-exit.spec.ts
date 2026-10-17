import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function open(page: Page) {
  const more = page.locator('[data-id="sample-0"] .more');
  await more.focus();
  await more.press("Enter");
  await page.getByRole("menu").evaluate((node) => {
    node.getAnimations().forEach((animation) => animation.finish());
  });
  await page.getByRole("menuitem", { name: "Rename", exact: true }).click();
  return page.locator(".rename-dialog");
}

async function settle(page: Page) {
  await page.locator(".rename-dialog").evaluate((node) => {
    node.getAnimations().forEach((animation) => animation.finish());
  });
  await expect
    .poll(() => page.locator(".rename-dialog").evaluate((node) => node.getAnimations().length))
    .toBe(0);
}

test("WEB-RX01 outside press dismisses but inside-to-outside drag does not", async ({ page }) => {
  await page.goto("/");
  const dialog = await open(page);
  await settle(page);
  const box = await dialog.boundingBox();
  if (!box) throw Error("Missing dialog");
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.mouse.down();
  await page.mouse.move(4, 4);
  await page.mouse.up();
  await expect(dialog).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
});

test("WEB-RX02 Cancel shell converges on ellipsis and fades without scaling form", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = await open(page);
  await settle(page);
  const formWidth = await dialog
    .locator("form")
    .evaluate((node) => node.getBoundingClientRect().width);
  const target = await page.locator('[data-id="sample-0"] .more').boundingBox();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const state = await dialog.evaluate((node) => {
    node.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 235;
    });
    const bounds = node.getBoundingClientRect();
    const form = node.querySelector("form");
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      opacity: Number(getComputedStyle(node).opacity),
      formWidth: form?.getBoundingClientRect().width,
    };
  });
  if (!target) throw Error("Missing target");
  expect(state.x).toBeCloseTo(target.x, 0);
  expect(state.y).toBeCloseTo(target.y, 0);
  expect(state.width).toBeCloseTo(target.width, 0);
  expect(state.height).toBeCloseTo(target.height, 0);
  expect(state.opacity).toBeLessThan(0.2);
  expect(state.formWidth).toBeCloseTo(formWidth, 0);
  await dialog.evaluate((node) => node.getAnimations().forEach((animation) => animation.finish()));
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
});

test("WEB-RX03 save commits once before motion and resolves rerendered trigger", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = await open(page);
  await settle(page);
  await page.getByLabel("Drawing name").fill("Renamed live");
  await dialog.locator("form").evaluate((form) => {
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    form.dispatchEvent(new Event("submit", { cancelable: true }));
    document.querySelectorAll(".rename-dialog").forEach((node) => {
      node.getAnimations().forEach((animation) => animation.pause());
    });
  });
  await expect(page.locator('[data-id="sample-0"] .drawing-tile')).toHaveAccessibleName(
    "Open Renamed live",
  );
  await expect(dialog).toHaveAttribute("data-closing", "true");
  await dialog.evaluate((node) => node.getAnimations().forEach((animation) => animation.play()));
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Renamed live" })).toBeFocused();
  await open(page);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("WEB-RX04 interrupted opening closes from current geometry; resize cleans up", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = await open(page);
  const before = await dialog.evaluate((node) => {
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 70;
    });
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  await page.keyboard.press("Escape");
  const after = await dialog.evaluate((node) => {
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  });
  expect(after).toEqual(before);
  await page.setViewportSize({ width: 600, height: 500 });
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
});

test("WEB-RX05 reduced motion validation and dismissal remain immediate", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const dialog = await open(page);
  await page.getByLabel("Drawing name").fill("   ");
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Enter a drawing name.");
  await page.mouse.click(4, 4);
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
});

test("WEB-RX06 ellipsis stays opaque at the exact dialog removal handoff", async ({ page }) => {
  await page.goto("/");
  await open(page);
  await settle(page);
  await page.mouse.move(4, 4);
  const opacity = await page.evaluate(async () => {
    const popup = document.querySelector<HTMLDialogElement>(".rename-dialog");
    const trigger = document.querySelector<HTMLElement>('[data-id="sample-0"] .more');
    if (!popup || !trigger) throw Error("Missing Rename controls");
    return new Promise<number>((resolve) => {
      const observer = new MutationObserver(() => {
        if (popup.isConnected) return;
        observer.disconnect();
        resolve(Number(getComputedStyle(trigger).opacity));
      });
      observer.observe(document.body, { childList: true });
      popup.dispatchEvent(new Event("cancel", { cancelable: true }));
    });
  });
  expect(opacity).toBe(1);
  await expect(page.locator('[data-id="sample-0"] .more')).toBeFocused();
});
