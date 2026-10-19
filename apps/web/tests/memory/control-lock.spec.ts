import { test, expect } from "@playwright/test";
import { setup, penEvent, ready, freeze } from "./pending-pen.ts";
import type { Page } from "@playwright/test";
async function appearance(page: Page) {
  return page
    .locator(
      "[data-memory-pen], [data-memory-color], [data-memory-width], [data-memory-undo], [data-memory-redo], [data-memory-rotation], .drawing-rail .drawing-tool",
    )
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const style = getComputedStyle(node);
        return {
          opacity: style.opacity,
          color: style.color,
          background: style.backgroundColor,
          border: style.borderColor,
          filter: style.filter,
        };
      }),
    );
}
async function noActivation(page: Page) {
  const controls = page.locator(
    "[data-memory-pen], [data-memory-color], [data-memory-width], [data-memory-undo], [data-memory-redo], [data-memory-rotation]",
  );
  for (const control of await controls.all()) await expect(control).toBeDisabled();
  expect(
    await controls.evaluateAll((nodes) => {
      let clicks = 0;
      const observe = () => {
        clicks++;
      };
      for (const node of nodes) {
        node.addEventListener("click", observe);
        if (node instanceof HTMLElement) node.click();
        node.removeEventListener("click", observe);
      }
      return clicks;
    }),
  ).toBe(0);
  await page.keyboard.press("ControlOrMeta+z");
}
test("WMP-02 transient interaction lock preserves control appearance and native disabled activation", async ({
  page,
  context,
}, info) => {
  const cdp = await setup(page, context);
  const empty = await appearance(page);
  await penEvent(cdp, "mousePressed", 1, 140, 260);
  await penEvent(cdp, "mouseMoved", 1, 180, 300);
  expect(await appearance(page)).toEqual(empty);
  await noActivation(page);
  await page.keyboard.press("Escape");
  await penEvent(cdp, "mouseReleased", 0);
  await ready(page);
  expect(await appearance(page)).toEqual(empty);
  for (const y of [300, 350]) {
    await penEvent(cdp, "mousePressed", 1, 140, y);
    await penEvent(cdp, "mouseMoved", 1, 220, y);
    await penEvent(cdp, "mouseReleased", 0, 220, y);
    await ready(page);
  }
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await page.mouse.move(600, 450);
  await page.locator("[data-memory-canvas]").focus();
  const idle = await appearance(page);
  const rail = await page.locator(".drawing-rail").screenshot();
  const settings = await page.locator(".drawing-context").screenshot();
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  await expect(page.locator("[data-memory-redo]")).toBeEnabled();
  await page.screenshot({ path: info.outputPath("controls-idle.png") });
  await freeze(page, cdp);
  expect(await appearance(page)).toEqual(idle);
  expect((await page.locator(".drawing-rail").screenshot()).equals(rail)).toBe(true);
  expect((await page.locator(".drawing-context").screenshot()).equals(settings)).toBe(true);
  await noActivation(page);
  await expect(page.locator("[data-memory-pen]")).toHaveCSS("cursor", "not-allowed");
  await page.screenshot({ path: info.outputPath("controls-pending.png") });
  await page.keyboard.press("Escape");
  await penEvent(cdp, "mouseReleased", 0);
  await ready(page);
  expect(await appearance(page)).toEqual(idle);
  await page.screenshot({ path: info.outputPath("controls-cancelled.png") });
  await page.locator("[data-memory-redo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-redo]")).toBeDisabled();
});
