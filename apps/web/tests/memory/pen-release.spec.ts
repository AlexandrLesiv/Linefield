import { test, expect } from "@playwright/test";
import { setup, freeze, penEvent, ready, diagnostics, clip } from "./pending-pen.ts";
test("WMP-02 trusted pen loss before delayed release freezes then commits once", async ({
  page,
  context,
}, info) => {
  const cdp = await setup(page, context);
  const empty = await page.screenshot({ clip });
  await freeze(page, cdp);
  const frozen = await page.screenshot({ clip });
  expect(frozen.equals(empty)).toBe(false);
  await page.screenshot({ path: info.outputPath("pending-release.png") });
  // Intentional event-order scenario delay proves no former 32ms expiry.
  await page.waitForTimeout(150);
  await penEvent(cdp, "mouseMoved", 0, 230, 340);
  await expect(page.locator("[data-memory-pending-release]")).toBeVisible();
  expect((await page.screenshot({ clip })).equals(frozen)).toBe(true);
  await penEvent(cdp, "mouseReleased", 0, 230, 340);
  await ready(page);
  await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  expect((await page.screenshot({ clip })).equals(empty)).toBe(false);
  await page.screenshot({ path: info.outputPath("released-ink.png") });
  expect(await diagnostics(page)).toMatchObject({
    input: {
      records: expect.arrayContaining([
        expect.objectContaining({ reason: "release-pending", acceptedSamples: "2" }),
        expect.objectContaining({ reason: "end", outcome: "ok", acceptedSamples: "2" }),
      ]),
    },
    pointerLifecycle: {
      records: expect.arrayContaining([
        expect.objectContaining({
          event: "lostpointercapture",
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
  expect((await page.screenshot({ clip })).equals(empty)).toBe(true);
});
