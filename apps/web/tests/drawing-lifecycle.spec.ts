import { test, expect } from "@playwright/test";

test("WEB-D2-03 hidden opacity never makes the Eraser width sample disappear", async ({ page }) => {
  await page.goto("/drawing/preview-new");
  await expect(page.locator(".back")).toBeFocused();
  await page.getByRole("slider", { name: "Opacity", exact: true }).fill("0");
  await page.getByRole("button", { name: "Eraser", exact: true }).click();
  await expect(page.locator(".stroke-preview svg")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Pen", exact: true }).click();
  await expect(page.locator(".stroke-preview svg")).toHaveCSS("opacity", "0");
});

for (const signal of ["blur", "resize", "pointercancel"]) {
  test(`WEB-D2-04/06 ${signal} cancels active adjustment and missing release permits fresh keyboard`, async ({
    page,
  }) => {
    await page.goto("/drawing/preview-new");
    await expect(page.locator(".back")).toBeFocused();
    const range = page.getByRole("slider", { name: "Width", exact: true });
    const box = await range.boundingBox();
    if (!box) throw Error("Missing range");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await expect(range).not.toHaveValue("8");
    // Injected lifecycle/cancel signal; browser supplies the preceding range interaction.
    if (signal === "pointercancel") await range.dispatchEvent("pointercancel");
    else await page.evaluate((type) => dispatchEvent(new Event(type)), signal);
    await expect(range).toHaveValue("8");
    await range.press("ArrowRight");
    await expect(range).toHaveValue("9");
    // A stale held pointer may not replace the fresh keyboard result.
    await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2);
    await page.mouse.up();
    await expect(range).toHaveValue("9");
    await range.press("ArrowRight");
    await expect(range).toHaveValue("10");
  });
}

test("WEB-D2-04 composition Escape has priority and a completed pointer press has no pending cancel", async ({
  page,
}) => {
  await page.goto("/drawing/preview-new");
  await expect(page.locator(".back")).toBeFocused();
  const range = page.getByRole("slider", { name: "Width", exact: true });
  await range.focus();
  expect(
    await range.evaluate((node) => {
      const event = new KeyboardEvent("keydown", {
        key: "Escape",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      });
      node.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(false);
  await range.click();
  const completed = await range.inputValue();
  await range.press("Escape");
  await expect(range).toHaveValue(completed);
  await expect(page).toHaveURL(/preview-new$/);
});

test("WEB-D2-06 motion captures keep chrome hidden during travel and preserve source geometry", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('[data-id="sample-0"] .drawing-tile').click();
  await page.locator(".drawing-surface").evaluate((node) => {
    for (const animation of node.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 180;
    }
  });
  await expect(page.locator(".drawing-chrome")).toHaveJSProperty("inert", true);
  await expect(page.locator(".drawing-chrome")).toHaveCSS("visibility", "hidden");
  await page.screenshot({ path: "quality/web-drawing-v2/entry-midpoint.png" });
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  await expect(page.locator(".back")).toBeFocused();
  await page.locator(".back").click();
  await page.locator(".drawing-surface").evaluate((node) => {
    for (const animation of node.getAnimations({ subtree: true })) {
      animation.pause();
      animation.currentTime = 180;
    }
  });
  await expect(page.locator(".drawing-chrome")).toHaveJSProperty("inert", true);
  await page.screenshot({ path: "quality/web-drawing-v2/exit-midpoint.png" });
  await page
    .locator(".drawing-surface")
    .evaluate((node) => node.getAnimations().forEach((a) => a.finish()));
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
});
