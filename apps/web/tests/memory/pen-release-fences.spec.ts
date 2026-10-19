import { test, expect } from "@playwright/test";
import { setup, freeze, penEvent, ready, clip } from "./pending-pen.ts";
test("WMP-02 trusted timestamp fixture older than capture loss cannot finish pending pen", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  await freeze(page, cdp);
  const timestamp = await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    const down = Number(canvas.getAttribute("data-test-down-time"));
    const loss = Number(canvas.getAttribute("data-test-loss-time"));
    return (performance.timeOrigin + (down + loss) / 2) / 1000;
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: 180,
    y: 300,
    button: "left",
    buttons: 0,
    pointerType: "pen",
    force: 0,
    timestamp,
  });
  await expect(page.locator("[data-memory-pending-release]")).toBeVisible();
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
});
test("WMP-02 pending Back preserves completed ink and both history stacks", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  const blank = await page.screenshot({ clip });
  for (const y of [350, 390]) {
    await penEvent(cdp, "mousePressed", 1, 140, y);
    await penEvent(cdp, "mouseMoved", 1, 240, y);
    await penEvent(cdp, "mouseReleased", 0, 240, y);
    await ready(page);
  }
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  const committed = await page.screenshot({ clip });
  expect(committed.equals(blank)).toBe(false);
  await freeze(page, cdp);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await ready(page);
  await penEvent(cdp, "mouseReleased", 0);
  expect((await page.screenshot({ clip })).equals(committed)).toBe(true);
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  await expect(page.locator("[data-memory-redo]")).toBeEnabled();
  await page.locator("[data-memory-redo]").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(committed)).toBe(false);
});
