import { expect } from "@playwright/test";
import type { Page, BrowserContext, CDPSession } from "@playwright/test";
export const clip = { x: 100, y: 200, width: 180, height: 220 };
export async function ready(page: Page) {
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
}
export async function penEvent(
  cdp: CDPSession,
  type: "mousePressed" | "mouseMoved" | "mouseReleased",
  buttons: number,
  x = 180,
  y = 300,
) {
  await cdp.send("Input.dispatchMouseEvent", {
    type,
    x,
    y,
    buttons,
    pointerType: "pen",
    force: buttons ? 0.6 : 0,
    ...(type === "mouseMoved" ? {} : { button: "left" }),
  });
}
export async function setup(page: Page, context: BrowserContext, enlarged = false) {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  if (enlarged)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
  await page.locator(".new-tile:visible, .mobile-create:visible").click();
  await ready(page);
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    canvas.addEventListener("pointerdown", (event) => {
      if (event instanceof PointerEvent) {
        canvas.setAttribute("data-test-pointer", String(event.pointerId));
        canvas.setAttribute("data-test-down-time", String(event.timeStamp));
      }
    });
    canvas.addEventListener("lostpointercapture", (event) => {
      canvas.setAttribute("data-test-loss-time", String(event.timeStamp));
    });
  });
  return context.newCDPSession(page);
}
export async function freeze(page: Page, cdp: CDPSession) {
  await penEvent(cdp, "mousePressed", 1, 140, 260);
  await penEvent(cdp, "mouseMoved", 1, 180, 300);
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    canvas.releasePointerCapture(Number(canvas.getAttribute("data-test-pointer")));
  });
  // Real browser pending-capture processing creates trusted loss before this hover.
  await penEvent(cdp, "mouseMoved", 0, 180, 300);
  await expect(page.locator("[data-memory-pending-release]")).toBeVisible();
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await expect(page.locator("[data-memory-width]")).toBeDisabled();
}
export async function diagnostics(page: Page) {
  await page.locator("[data-memory-diagnostics]").click();
  return JSON.parse(await page.evaluate(() => navigator.clipboard.readText())) as unknown;
}
