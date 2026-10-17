import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function openMenu(page: Page) {
  const trigger = page.locator('[data-id="sample-0"] .more');
  await trigger.focus();
  await trigger.press("Enter");
  return page.locator(".gallery-menu");
}

test("WEB-DM01 interrupted Delete begins at the current menu bounds without blur", async ({
  page,
}) => {
  await page.goto("/");
  const menu = await openMenu(page);
  const geometry = await menu.evaluate((node) => {
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 70;
    });
    const bounds = node.getBoundingClientRect();
    const before = { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    node.querySelector<HTMLButtonElement>(".destructive")?.click();
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    document
      .querySelector('[data-id="sample-0"] .undo')
      ?.getAnimations()
      .forEach((animation) => {
        animation.pause();
        animation.currentTime = 0;
      });
    const after = node.getBoundingClientRect();
    return { before, after: { x: after.x, y: after.y, width: after.width, height: after.height } };
  });
  expect(geometry.after).toEqual(geometry.before);
  await expect(page.locator('[data-id="sample-0"] .undo')).toHaveCSS("opacity", "0");
  await expect(menu).toHaveCSS("pointer-events", "none");
  await expect(menu).toHaveCSS("filter", "none");
  await expect(page.locator('[data-id="sample-0"] .undo')).toBeFocused();
  await page.locator('[data-id="sample-0"] .undo').click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Coastal house" })).toBeFocused();
});

test("WEB-DM02 normal playback leaves only the live Undo and resize removes obsolete motion", async ({
  page,
}) => {
  await page.goto("/");
  const menu = await openMenu(page);
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(1);
  await page.getByRole("button", { name: "Undo" }).click();
  await openMenu(page);
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await page.setViewportSize({ width: 650, height: 500 });
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Undo" })).toBeFocused();
});

test("WEB-DM03 final hold has one opaque Undo with exact destination geometry", async ({
  page,
}) => {
  await page.goto("/");
  const menu = await openMenu(page);
  const state = await menu.evaluate((node) => {
    // Exercise the focus-scroll offset that a shrinking menu can otherwise retain.
    node.style.height = "40px";
    node.scrollTop = 2;
    node.querySelector<HTMLButtonElement>(".destructive")?.click();
    const live = document.querySelector<HTMLElement>('[data-id="sample-0"] .undo');
    const clone = node.querySelector<HTMLElement>(":scope > .undo");
    if (!live || !clone) throw Error("Missing Undo owner");
    [...node.getAnimations({ subtree: true }), ...live.getAnimations()].forEach((animation) => {
      animation.pause();
      animation.currentTime = 275;
    });
    const rect = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
    };
    return {
      shell: rect(node),
      live: rect(live),
      clone: rect(clone),
      shellOpacity: getComputedStyle(node).opacity,
      cloneOpacity: getComputedStyle(clone).opacity,
      liveOpacity: getComputedStyle(live).opacity,
      color: getComputedStyle(node).backgroundColor,
      targetColor: getComputedStyle(live).backgroundColor,
      align: getComputedStyle(clone).textAlign,
      targetAlign: getComputedStyle(live).textAlign,
    };
  });
  expect(state.shell).toEqual(state.live);
  expect(state.clone).toEqual(state.live);
  expect(state.shellOpacity).toBe("1");
  expect(state.cloneOpacity).toBe("1");
  expect(state.liveOpacity).toBe("0");
  expect(state.color).toBe(state.targetColor);
  expect(state.align).toBe(state.targetAlign);
  await page.evaluate(() => {
    // The injected scroll may already have triggered the intentional obsolete-motion cleanup.
    document
      .querySelector(".gallery-menu")
      ?.getAnimations()
      .forEach((animation) => animation.finish());
  });
  await expect(menu).toHaveCount(0);
  await expect(page.locator('[data-id="sample-0"] .undo')).toHaveCSS("opacity", "1");
});
