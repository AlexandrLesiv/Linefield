import { test, expect } from "@playwright/test";
import type { Page, CDPSession } from "@playwright/test";
import { penEvent, ready, diagnostics } from "./pending-pen.ts";
import { setup, begin, freshInk, clip } from "./viewport-pen-fixture.ts";
async function freeze(page: Page, cdp: CDPSession) {
  await begin(page, cdp);
  await page
    .locator("[data-memory-canvas]")
    .evaluate((canvas) =>
      canvas.releasePointerCapture(Number(canvas.getAttribute("data-test-pointer"))),
    );
  // Browser-generated trusted zero-button loss models the observed Wacom ordering.
  await penEvent(cdp, "mouseMoved", 0, 601, 501);
  await expect(page.locator("[data-memory-pending-release]")).toBeVisible();
}
test("WMP-11 pen pan delayed release freezes accepted view without snapback or hover movement", async ({
  page,
  context,
}) => {
  const cdp = await setup(page, context);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const original = await page.screenshot({ clip });
  await freeze(page, cdp);
  const frozen = await page.screenshot({ clip });
  expect(frozen.equals(original)).toBe(false);
  // Scenario delay proves the old 32ms deadline is not used for pan either.
  await page.waitForTimeout(150);
  await penEvent(cdp, "mouseMoved", 0, 700, 550);
  expect((await page.screenshot({ clip })).equals(frozen)).toBe(true);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await penEvent(cdp, "mouseReleased", 0, 700, 550);
  await page.keyboard.up("Space");
  await ready(page);
  await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
  expect((await page.screenshot({ clip })).equals(frozen)).toBe(true);
  await freshInk(page, cdp, frozen);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  const report = await diagnostics(page);
  expect(report).toMatchObject({
    input: {
      records: expect.arrayContaining([
        expect.objectContaining({ reason: "pan-release-pending", source: "pen" }),
        expect.objectContaining({ reason: "pan-end", outcome: "ok", source: "pen" }),
      ]),
    },
    pointerLifecycle: {
      records: expect.arrayContaining([
        expect.objectContaining({
          event: "lostpointercapture",
          source: "pen",
          trusted: true,
          buttons: 0,
          button: -1,
        }),
      ]),
    },
  });
  expect(JSON.stringify(report)).not.toMatch(/"(?:clientX|clientY|pressure|color|points)":/);
});
for (const action of ["Escape", "pressed-move", "fresh-contact"] as const) {
  test(`WMP-11 pending pen pan ${action} cancels old view without stale release mutation`, async ({
    page,
    context,
  }) => {
    const cdp = await setup(page, context);
    const original = await page.screenshot({ clip });
    await freeze(page, cdp);
    if (action === "Escape") await page.keyboard.press("Escape");
    else if (action === "pressed-move") await penEvent(cdp, "mouseMoved", 1, 650, 500);
    else {
      await penEvent(cdp, "mousePressed", 1, 550, 450);
      await penEvent(cdp, "mouseMoved", 1, 600, 500);
      await page.keyboard.press("Escape");
    }
    await ready(page);
    await expect(page.locator("[data-memory-pending-release]")).toBeHidden();
    await penEvent(cdp, "mouseReleased", 0, 600, 500);
    await page.keyboard.up("Space");
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    await freshInk(page, cdp, original);
  });
}
