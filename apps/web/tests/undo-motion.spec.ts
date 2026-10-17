import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function remove(page: Page) {
  const trigger = page.locator('[data-id="sample-0"] .more');
  await trigger.focus();
  await trigger.press("Enter");
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
}

test("WEB-UM01 Undo restores immediately then morphs to live ellipsis", async ({ page }) => {
  await page.goto("/");
  await remove(page);
  await expect(page.locator(".gallery-menu")).toHaveCount(0);
  const before = await page.locator('[data-id="sample-0"] .undo').boundingBox();
  const sample = await page.locator('[data-id="sample-0"] .undo').evaluate((node) => {
    if (!(node instanceof HTMLElement)) throw Error("Invalid Undo control");
    node.click();
    const shell = document.querySelector<HTMLElement>("[data-undo-motion]");
    const more = document.querySelector<HTMLElement>('[data-id="sample-0"] .more');
    if (!shell || !more) throw Error("Missing motion/target");
    shell.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    more.getAnimations().forEach((animation) => {
      if (animation instanceof CSSTransition) {
        animation.finish();
        return;
      }
      animation.pause();
      animation.currentTime = 0;
    });
    const rect = shell.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  expect(sample).toEqual(before);
  await expect(page.getByRole("button", { name: "Actions for Coastal house" })).toBeFocused();
  await expect(page.getByRole("button", { name: "Open Coastal house" })).toHaveCount(1);
  const geometry = await page.locator("[data-undo-motion]").evaluate((node) => {
    node.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 275;
    });
    const target = document.querySelector<HTMLElement>('[data-id="sample-0"] .more');
    if (!target) throw Error("Missing more");
    const rect = (element: Element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    };
    return { shell: rect(node), target: rect(target), opacity: getComputedStyle(target).opacity };
  });
  expect(geometry.shell).toEqual(geometry.target);
  expect(geometry.opacity).toBe("0");
  await page.evaluate(() =>
    document
      .querySelector("[data-undo-motion]")
      ?.getAnimations()
      .forEach((animation) => animation.finish()),
  );
  await expect(page.locator("[data-undo-motion]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Coastal house" })).toHaveCSS(
    "opacity",
    "1",
  );
});

test("WEB-UM02 immediate Undo takes over current moving Delete bounds", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-id="sample-0"] .more').focus();
  await page.locator('[data-id="sample-0"] .more').press("Enter");
  const geometry = await page.locator(".gallery-menu").evaluate((node) => {
    node.querySelector<HTMLButtonElement>(".destructive")?.click();
    node.getAnimations({ subtree: true }).forEach((animation) => {
      animation.pause();
      animation.currentTime = 100;
    });
    const before = node.getBoundingClientRect();
    const source = { x: before.x, y: before.y, width: before.width, height: before.height };
    document.querySelector<HTMLButtonElement>('[data-id="sample-0"] .undo')?.click();
    const shell = document.querySelector<HTMLElement>("[data-undo-motion]");
    if (!shell) throw Error("Missing takeover");
    shell.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 0;
    });
    const after = shell.getBoundingClientRect();
    return { source, next: { x: after.x, y: after.y, width: after.width, height: after.height } };
  });
  expect(geometry.next).toEqual(geometry.source);
  await expect(page.locator(".gallery-menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Coastal house" })).toBeFocused();
  await page.setViewportSize({ width: 700, height: 500 });
  await expect(page.locator("[data-undo-motion]")).toHaveCount(0);
});

test("WEB-UM03 normal playback and reduced motion restore without stale surfaces", async ({
  page,
}) => {
  await page.goto("/");
  await remove(page);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-undo-motion], .gallery-menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Coastal house" })).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await remove(page);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-undo-motion], .gallery-menu")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Actions for Coastal house" })).toBeFocused();
});

test("WEB-UM04 next control activation cancels obsolete Undo visual without consuming input", async ({
  page,
}) => {
  await page.goto("/");
  await remove(page);
  await expect(page.locator(".gallery-menu")).toHaveCount(0);
  await page.locator('[data-id="sample-0"] .undo').evaluate((node) => {
    if (!(node instanceof HTMLElement)) throw Error("Invalid Undo");
    node.click();
    document
      .querySelector("[data-undo-motion]")
      ?.getAnimations()
      .forEach((animation) => animation.pause());
  });
  await expect(page.locator("[data-undo-motion]")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-undo-motion]")).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: "Rename", exact: true })).toBeFocused();
});
