import { test, expect } from "@playwright/test";
import { penEvent, ready } from "./pending-pen.ts";
import { inkBounds } from "./pixel-bounds.ts";
import { setup, begin, freshInk, clip } from "./viewport-pen-fixture.ts";
test("WMP-11 Space plus pen follows held tip, replaces without jump and adds no history", async ({
  page,
  context,
}, info) => {
  const cdp = await setup(page, context);
  const original = await inkBounds(page, clip);
  await begin(page, cdp);
  const first = await inkBounds(page, clip);
  expect(first.minX - original.minX).toBe(50);
  expect(first.minY - original.minY).toBe(50);
  await penEvent(cdp, "mouseMoved", 1, 650, 500);
  const second = await inkBounds(page, clip);
  expect(second.minX - original.minX).toBe(100);
  expect(second.minY - original.minY).toBe(50);
  await page.screenshot({ path: info.outputPath("pen-held-pan.png") });
  await penEvent(cdp, "mouseReleased", 0, 650, 500);
  await page.keyboard.up("Space");
  await ready(page);
  expect(await inkBounds(page, clip)).toEqual(second);
  const panned = await page.screenshot({ clip });
  await freshInk(page, cdp, panned);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await inkBounds(page, clip)).maxX).toBe(-1);
});
test("WMP-11 Space-up held pen suppresses ink and ignores wrong-source/stale release fixtures", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  await begin(page, cdp);
  const panned = await page.screenshot({ clip });
  // A second physical-source contact cannot replace the current pen pan owner.
  await penEvent(cdp, "mousePressed", 1, 620, 510, "mouse");
  await penEvent(cdp, "mouseReleased", 0, 620, 510, "mouse");
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(panned)).toBe(true);
  // Explicit hostile DOM fixtures: no claim of physical device event generation.
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    const pointerId = Number(canvas.getAttribute("data-test-pointer"));
    for (const type of ["pointermove", "pointerup", "pointercancel", "lostpointercapture"]) {
      canvas.dispatchEvent(
        new PointerEvent(type, { pointerId, pointerType: "mouse", isPrimary: true }),
      );
    }
    const stale = new PointerEvent("pointerup", {
      pointerId,
      pointerType: "pen",
      isPrimary: true,
    });
    Object.defineProperty(stale, "timeStamp", {
      value: Number(canvas.getAttribute("data-test-down-time")) - 1,
    });
    canvas.dispatchEvent(stale);
  });
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(panned)).toBe(true);
  await penEvent(cdp, "mouseMoved", 1, 650, 500);
  const continued = await page.screenshot({ clip });
  expect(continued.equals(panned)).toBe(false);
  await page.keyboard.up("Space");
  await ready(page);
  await penEvent(cdp, "mouseMoved", 1, 650, 450);
  await penEvent(cdp, "mouseReleased", 0, 650, 450);
  expect((await page.screenshot({ clip })).equals(continued)).toBe(true);
  await freshInk(page, cdp, continued);
});
for (const interruption of ["Escape", "pressed-capture-loss"] as const) {
  test(`WMP-11 pen pan ${interruption} restores view and accepts fresh pen ink`, async ({
    page,
    context,
  }) => {
    const cdp = await setup(page, context);
    const original = await page.screenshot({ clip });
    await begin(page, cdp);
    expect((await page.screenshot({ clip })).equals(original)).toBe(false);
    if (interruption === "Escape") await page.keyboard.press("Escape");
    else {
      await page
        .locator("[data-memory-canvas]")
        .evaluate((canvas) =>
          canvas.releasePointerCapture(Number(canvas.getAttribute("data-test-pointer"))),
        );
      await penEvent(cdp, "mouseMoved", 1, 600, 500);
    }
    await ready(page);
    await penEvent(cdp, "mouseReleased", 0, 600, 500);
    await page.keyboard.up("Space");
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    await freshInk(page, cdp, original);
  });
}
