import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function ready(page: Page) {
  await expect(page.locator("[data-memory-canvas]")).toHaveAttribute("data-state", "ready");
}
async function open(page: Page) {
  await page.goto("/");
  await page.locator(".new-tile").click();
  await ready(page);
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    new MutationObserver((records) => {
      if (
        canvas.getAttribute("data-state") === "loading" ||
        records.some((v) => v.oldValue === "loading")
      )
        canvas.setAttribute("data-test-unexpected-loading", "true");
    }).observe(canvas, {
      attributes: true,
      attributeFilter: ["data-state"],
      attributeOldValue: true,
    });
  });
}
test("WMP-01/02 terminal pen zero pressure retains long ink without preparation overlay", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: 250,
    y: 300,
    button: "left",
    buttons: 1,
    pointerType: "pen",
    force: 0.6,
  });
  for (let i = 1; i <= 600; i++) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: 250 + i / 2,
      y: 300 + 30 * Math.sin(i / 30),
      buttons: 1,
      pointerType: "pen",
      force: 0.2 + (i % 100) / 150,
    });
  }
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: 550,
    y: 300,
    button: "left",
    buttons: 0,
    pointerType: "pen",
    force: 0,
  });
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
  await expect(page.locator("[data-memory-canvas]")).not.toHaveAttribute(
    "data-test-unexpected-loading",
    "true",
  );
  const clip = { x: 100, y: 200, width: 600, height: 350 };
  const ink = await page.screenshot({ clip });
  await page.screenshot({ path: info.outputPath("pen-finished.png") });
  await page.locator("[data-memory-diagnostics]").click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const summary: unknown = JSON.parse(copied);
  expect(summary).toMatchObject({
    format: "linefield-manual-input-v1",
    input: {
      records: expect.arrayContaining([
        expect.objectContaining({ source: "pen", reason: "end", outcome: "ok" }),
      ]),
    },
  });
  expect(copied).not.toMatch(/clientX|clientY|pressure|color|points/);
  expect(summary).toMatchObject({
    pointerLifecycle: {
      records: expect.arrayContaining([
        expect.objectContaining({
          event: "pointerup",
          source: "pen",
          olderThanDown: false,
          trusted: true,
          matchesTrackedPointer: true,
        }),
      ]),
    },
  });
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(ink)).toBe(true);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await page.screenshot({ clip })).equals(ink)).toBe(false);
});
test("WMP-02 browser event fixture exposes acquisition overflow and permits fresh ink", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await open(page);
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    canvas.addEventListener(
      "pointerdown",
      (event) => {
        if (event instanceof PointerEvent)
          canvas.setAttribute("data-test-pointer", String(event.pointerId));
      },
      { once: true },
    );
  });
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.locator("[data-memory-canvas]").evaluate((canvas) => {
    const event = new PointerEvent("pointermove", {
      pointerId: Number(canvas.getAttribute("data-test-pointer")),
      pointerType: "mouse",
      isPrimary: true,
      buttons: 1,
      clientX: 260,
      clientY: 300,
    });
    Object.defineProperty(event, "getCoalescedEvents", {
      value: () => Array.from({ length: 1025 }, () => event),
    });
    canvas.dispatchEvent(event);
  });
  await page.mouse.up();
  await expect(page.locator("[data-memory-input-failure]")).toBeVisible();
  await expect(page.locator("[data-memory-input-failure]")).toContainText("capacity");
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  await page.screenshot({ path: info.outputPath("input-overflow.png") });
  await page.locator("[data-memory-diagnostics]").click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(JSON.parse(copied)).toMatchObject({
    input: {
      records: expect.arrayContaining([
        expect.objectContaining({
          reason: "queue-overflow",
          outcome: "capacity",
          maxCoalesced: 1025,
        }),
      ]),
    },
  });
  await page.mouse.move(250, 300);
  await page.mouse.down();
  await page.mouse.move(400, 350, { steps: 12 });
  await page.mouse.up();
  await ready(page);
  await expect(page.locator("[data-memory-input-failure]")).toBeHidden();
  await expect(page.locator("[data-memory-undo]")).toBeEnabled();
});
