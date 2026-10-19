import { test, expect } from "@playwright/test";
import { setup, freeze, penEvent, ready, clip } from "./pending-pen.ts";
for (const interruption of [
  "escape",
  "blur",
  "hidden",
  "cancel",
  "pressed",
  "capture",
  "remap",
  "back",
] as const) {
  test(`WMP-02 pending pen ${interruption} cancels without history and permits fresh input`, async ({
    page,
    context,
  }) => {
    const cdp = await setup(page, context);
    const empty = await page.screenshot({ clip });
    await freeze(page, cdp);
    if (interruption === "escape") await page.keyboard.press("Escape");
    if (interruption === "blur")
      await page.locator("[data-memory-canvas]").evaluate((node) => node.blur());
    if (interruption === "hidden")
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        document.dispatchEvent(new Event("visibilitychange"));
        Object.defineProperty(document, "hidden", { configurable: true, value: false });
      });
    if (interruption === "cancel" || interruption === "capture") {
      await page.locator("[data-memory-canvas]").evaluate(
        (canvas, type) => {
          canvas.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: Number(canvas.getAttribute("data-test-pointer")),
              pointerType: "pen",
              isPrimary: true,
            }),
          );
        },
        interruption === "cancel" ? "pointercancel" : "gotpointercapture",
      );
    }
    if (interruption === "pressed") await penEvent(cdp, "mouseMoved", 1, 210, 330);
    if (interruption === "remap") await page.setViewportSize({ width: 1100, height: 850 });
    if (interruption === "back") {
      await page.locator(".back").click();
      await expect(page.locator(".drawing-surface")).toHaveCount(0);
      await page.locator(".new-tile").click();
    }
    await penEvent(cdp, "mouseReleased", 0);
    await ready(page);
    await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
    await expect(page.locator("[data-memory-undo]")).toBeDisabled();
    expect((await page.screenshot({ clip })).equals(empty)).toBe(true);
    await penEvent(cdp, "mousePressed", 1, 140, 260);
    await penEvent(cdp, "mouseMoved", 1, 180, 300);
    await penEvent(cdp, "mouseReleased", 0);
    await ready(page);
    await expect(page.locator("[data-memory-undo]")).toBeEnabled();
    expect((await page.screenshot({ clip })).equals(empty)).toBe(false);
  });
}
test("WMP-02 pending wrong and stale browser-event fixtures cannot replace the contact", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  await freeze(page, cdp);
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    const pointerId = Number(canvas.getAttribute("data-test-pointer"));
    for (const [type, pointer, old] of [
      ["pointerup", pointerId + 100, false],
      ["pointerup", pointerId, false],
      ["pointerdown", pointerId, true],
      ["lostpointercapture", pointerId, true],
    ] as const) {
      const event = new PointerEvent(type, {
        bubbles: true,
        pointerId: pointer,
        pointerType: "pen",
        isPrimary: true,
        button: 0,
        buttons: type === "pointerdown" ? 1 : 0,
      });
      if (old) Object.defineProperty(event, "timeStamp", { value: 0 });
      canvas.dispatchEvent(event);
    }
  });
  await expect(page.locator("[data-memory-pending-release]")).toBeVisible();
  await penEvent(cdp, "mouseReleased", 0);
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
});
test("WMP-02 fresh pen down cancels pending prefix and begins same contact; old up is fenced", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  const empty = await page.screenshot({ clip });
  await freeze(page, cdp);
  const oldPointer = await page.locator("[data-memory-canvas]").getAttribute("data-test-pointer");
  await penEvent(cdp, "mousePressed", 1, 140, 360);
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute(
    "data-test-pointer",
    oldPointer!,
  );
  await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    const event = new PointerEvent("pointerup", {
      pointerId: Number(canvas.getAttribute("data-test-pointer")),
      pointerType: "pen",
      isPrimary: true,
      button: 0,
    });
    Object.defineProperty(event, "timeStamp", { value: 0 });
    canvas.dispatchEvent(event);
  });
  await penEvent(cdp, "mouseMoved", 1, 240, 390);
  await penEvent(cdp, "mouseReleased", 0, 240, 390);
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  expect((await page.screenshot({ clip })).equals(empty)).toBe(false);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(empty)).toBe(true);
});
