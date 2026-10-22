import { test, expect } from "@playwright/test";
import { complete, clear } from "./observed-frame.ts";
for (const count of [127, 128, 129]) {
  test(`MIG-LIVE-02 pressure curve at ${count} accepted points preserves live/final/rebuilt pixels`, async ({
    page,
    context,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    const clip = { x: 200, y: 220, width: 750, height: 450 },
      blank = await page.screenshot({ clip });
    const cdp = await context.newCDPSession(page);
    await clear(page);
    let x = 250,
      y = 400;
    // Browser-generated trusted pen events; physical Wacom timing is a separate hardware gap.
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x,
      y,
      button: "left",
      buttons: 1,
      pointerType: "pen",
      force: 0.05,
      clickCount: 1,
    });
    for (let i = 1; i < count; i++) {
      x = 250 + i * 4;
      y = 400 + Math.sin(i / 13) * 110;
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x,
        y,
        button: "left",
        buttons: 1,
        pointerType: "pen",
        force: 0.05 + (Math.sin(i / 7) + 1) * 0.475,
      });
    }
    await complete(page, false, true);
    const active = await page.screenshot({ clip });
    expect(active.equals(blank)).toBe(false);
    await clear(page);
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x,
      y,
      button: "left",
      buttons: 0,
      pointerType: "pen",
      force: 0,
      clickCount: 1,
    });
    await complete(page);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(active)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(blank)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    await expect.poll(async () => (await page.screenshot({ clip })).equals(active)).toBe(true);
    await cdp.detach();
  });
}
