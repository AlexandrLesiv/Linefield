import { test, expect } from "@playwright/test";
import { setup, freeze, penEvent, ready, diagnostics, clip } from "./pending-pen.ts";
test("WMP-02 trusted mouse loss before delayed release commits once and rejects pen release", async ({
  page,
  context,
}, info) => {
  const cdp = await setup(page, context);
  const blank = await page.screenshot({ clip });
  await freeze(page, cdp, "mouse");
  const frozen = await page.screenshot({ clip });
  expect(frozen.equals(blank)).toBe(false);
  await page.screenshot({ path: info.outputPath("mouse-pending.png") });
  // Scenario delay, not an admission wait: no elapsed-time release expiry exists.
  await page.waitForTimeout(150);
  await penEvent(cdp, "mouseMoved", 0, 240, 340, "mouse");
  await penEvent(cdp, "mouseReleased", 0, 240, 340, "pen");
  await expect(page.locator("[data-memory-pending-release]")).toBeVisible();
  expect((await page.screenshot({ clip })).equals(frozen)).toBe(true);
  await penEvent(cdp, "mouseReleased", 0, 240, 340, "mouse");
  await ready(page);
  await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  expect((await page.screenshot({ clip })).equals(frozen)).toBe(true);
  expect(await diagnostics(page)).toMatchObject({
    input: {
      records: expect.arrayContaining([
        expect.objectContaining({
          source: "mouse",
          reason: "release-pending",
          acceptedSamples: "2",
        }),
        expect.objectContaining({
          source: "mouse",
          reason: "end",
          outcome: "ok",
          acceptedSamples: "2",
        }),
      ]),
    },
    pointerLifecycle: {
      records: expect.arrayContaining([
        expect.objectContaining({
          event: "lostpointercapture",
          source: "mouse",
          trusted: true,
          buttons: 0,
          button: -1,
        }),
      ]),
    },
  });
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
});
test("WMP-02 reused mouse ID fresh down cancels pending prefix and rejects stale release", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  const blank = await page.screenshot({ clip });
  await freeze(page, cdp, "mouse");
  const canvas = page.locator("[data-memory-canvas]");
  const oldId = await canvas.getAttribute("data-test-pointer");
  expect(oldId).toBe("1");
  await penEvent(cdp, "mousePressed", 1, 140, 360, "mouse");
  await expect(canvas).toHaveAttribute("data-test-pointer", oldId!);
  await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
  await canvas.evaluate((node) => {
    const event = new PointerEvent("pointerup", {
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
    });
    Object.defineProperty(event, "timeStamp", { value: 0 });
    node.dispatchEvent(event);
  });
  await penEvent(cdp, "mouseMoved", 1, 240, 390, "mouse");
  await penEvent(cdp, "mouseReleased", 0, 240, 390, "mouse");
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  expect((await page.screenshot({ clip })).equals(blank)).toBe(false);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
});
test("WMP-02 pressed movement still cancels pending mouse without committing", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  const blank = await page.screenshot({ clip });
  await freeze(page, cdp, "mouse");
  await penEvent(cdp, "mouseMoved", 1, 220, 340, "mouse");
  await penEvent(cdp, "mouseReleased", 0, 220, 340, "mouse");
  await ready(page);
  await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
});
