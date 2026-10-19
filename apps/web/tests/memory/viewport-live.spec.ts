import { test, expect } from "@playwright/test";
import { inkBounds } from "./pixel-bounds.ts";
import type { Page } from "@playwright/test";
const clip = { x: 100, y: 200, width: 650, height: 350 };
async function ready(page: Page) {
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
}
async function setup(page: Page) {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(400, 350, { steps: 5 });
  await page.mouse.up();
  await ready(page);
  await page.locator("[data-memory-canvas]").evaluate((canvas) =>
    window.addEventListener(
      "pointerdown",
      (event) => {
        if (event instanceof PointerEvent)
          canvas.setAttribute("data-test-pointer", String(event.pointerId));
      },
      { capture: true },
    ),
  );
}
test("WMP-11 held drag visibly translates ink at each move before release", async ({
  page,
}, info) => {
  await setup(page);
  const original = await inkBounds(page, clip);
  await page.keyboard.down("Space");
  await page.mouse.move(550, 450);
  await page.mouse.down();
  await page.mouse.move(600, 500);
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "updating");
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  const first = await inkBounds(page, clip);
  expect(first.minX - original.minX).toBe(50);
  expect(first.minY - original.minY).toBe(50);
  await page.mouse.move(650, 500);
  const second = await inkBounds(page, clip);
  expect(second.minX - original.minX).toBe(100);
  expect(second.minY - original.minY).toBe(50);
  await page.screenshot({ path: info.outputPath("held-pan-visible.png") });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect(await inkBounds(page, clip)).toEqual(second);
});
for (const interruption of ["pointercancel", "remap"] as const) {
  test(`WMP-11 ${interruption} disarms held Space and permits fresh ink`, async ({ page }) => {
    await setup(page);
    const original = await page.screenshot({ clip });
    await page.keyboard.down("Space");
    await page.mouse.move(550, 450);
    await page.mouse.down();
    await page.mouse.move(600, 500);
    if (interruption === "remap") await page.setViewportSize({ width: 1200, height: 900 });
    else
      await page.locator("[data-memory-canvas]").evaluate((canvas) =>
        canvas.dispatchEvent(
          new PointerEvent("pointercancel", {
            pointerId: Number(canvas.getAttribute("data-test-pointer")),
            pointerType: "mouse",
            isPrimary: true,
          }),
        ),
      );
    await ready(page);
    await expect(page.locator("[data-memory-canvas]")).not.toHaveCSS("cursor", "grab");
    await expect(page.locator("[data-memory-canvas]")).not.toHaveCSS("cursor", "grabbing");
    await expect(page.locator("[data-memory-undo]")).toBeEnabled();
    await page.mouse.up();
    const before = await page.screenshot({ clip });
    if (interruption === "pointercancel") expect(before.equals(original)).toBe(true);
    await page.mouse.move(500, 300);
    await page.mouse.down();
    await page.mouse.move(600, 300);
    await page.mouse.up();
    await ready(page);
    expect((await page.screenshot({ clip })).equals(before)).toBe(false);
    await page.keyboard.up("Space");
    await page.locator("[data-memory-undo]").click();
    await ready(page);
    expect((await page.screenshot({ clip })).equals(before)).toBe(true);
  });
}
