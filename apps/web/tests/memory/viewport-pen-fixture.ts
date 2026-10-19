import { expect } from "@playwright/test";
import type { Page, BrowserContext, CDPSession } from "@playwright/test";
import { penEvent, ready } from "./pending-pen.ts";
export const clip = { x: 100, y: 200, width: 650, height: 350 };
export async function setup(page: Page, context: BrowserContext) {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  const cdp = await context.newCDPSession(page);
  await penEvent(cdp, "mousePressed", 1, 250, 300);
  await penEvent(cdp, "mouseMoved", 1, 400, 350);
  await penEvent(cdp, "mouseReleased", 0, 400, 350);
  await ready(page);
  await page.locator("[data-memory-canvas]").evaluate((canvas) =>
    window.addEventListener(
      "pointerdown",
      (event) => {
        if (event instanceof PointerEvent && event.pointerType === "pen") {
          canvas.setAttribute("data-test-pointer", String(event.pointerId));
          canvas.setAttribute("data-test-down-time", String(event.timeStamp));
        }
      },
      { capture: true },
    ),
  );
  return cdp;
}
export async function begin(page: Page, cdp: CDPSession) {
  await page.locator("[data-memory-canvas]").focus();
  await page.keyboard.down("Space");
  await penEvent(cdp, "mousePressed", 1, 550, 450);
  await penEvent(cdp, "mouseMoved", 1, 600, 500);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
}
export async function freshInk(page: Page, cdp: CDPSession, before: Buffer) {
  await penEvent(cdp, "mousePressed", 1, 500, 300);
  await penEvent(cdp, "mouseMoved", 1, 600, 300);
  await penEvent(cdp, "mouseReleased", 0, 600, 300);
  await ready(page);
  expect((await page.screenshot({ clip })).equals(before)).toBe(false);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(before)).toBe(true);
}
