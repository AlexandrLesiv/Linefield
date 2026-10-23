import { test, expect } from "@playwright/test";
import { complete, clear } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
import type { Page } from "@playwright/test";

async function panAway(page: Page) {
  await clear(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(1000, 700);
  await page.mouse.down();
  await page.mouse.move(100, 700);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await complete(page);
}
async function metrics(page: Page) {
  const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
  if (!snapshot || snapshot.dropped) throw Error("visibility observation missing or dropped");
  return snapshot.geometry;
}
test.use({ viewport: { width: 1280, height: 900 } });
for (const packed of [false, true])
  test(`MIG-WORKER-34 ordered offscreen hierarchy and restored history (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    test.setTimeout(60000);
    if (packed) await forcePackedTargets(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    const clip = { x: 280, y: 280, width: 360, height: 300 };
    const blank = await page.screenshot({ clip });
    for (let i = 0; i < 64; i++) {
      await clear(page);
      const x = 300 + (i % 8) * 40,
        y = 300 + Math.floor(i / 8) * 32;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 20, y + 8);
      await page.mouse.up();
      await complete(page);
    }
    const original = await page.screenshot({ clip });
    expect(original.equals(blank)).toBe(false);
    await panAway(page);
    expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    const before = await metrics(page);
    await panAway(page);
    const after = await metrics(page);
    expect(after.visibilityQueries).toBeGreaterThan(before.visibilityQueries);
    expect(after.visibilityHulls).toBe(before.visibilityHulls);
    expect(after.visibilityVisits - before.visibilityVisits).toBeLessThan(64);
    expect(after.visibilityMaxVisits).toBeLessThanOrEqual(512);
    expect(after.visibilityMaxHulls).toBeLessThanOrEqual(4);
    await clear(page);
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page, true);
    expect((await page.screenshot({ clip })).equals(original)).toBe(false);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    await info.attach("actual-route-visibility-work", {
      body: JSON.stringify({ before, after }),
      contentType: "application/json",
    });
  });
