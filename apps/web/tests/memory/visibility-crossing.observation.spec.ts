import { test, expect } from "@playwright/test";
import { complete, clear } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
test.use({ viewport: { width: 1400, height: 950 } });
for (const packed of [false, true])
  test(`MIG-WORKER-35 thick rotated chunk crossings preserve exact cancelled view and Redo (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    if (packed) await forcePackedTargets(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await page.locator("input[type=range]").focus();
    await page.keyboard.press("End");
    for (let i = 0; i < 19; i++) await page.keyboard.press("ArrowLeft");
    await expect(page.locator("input[type=range]")).toHaveValue("493");
    for (let i = 0; i < 12; i++)
      await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
    await clear(page);
    await page.mouse.move(700, 500);
    await page.mouse.wheel(0, 100000);
    await expect(page.locator(".canvas-footer")).toContainText("5%");
    await complete(page);
    const clip = { x: 240, y: 240, width: 900, height: 500 };
    const blank = await page.screenshot({ clip });
    await clear(page);
    await page.mouse.move(180, 280);
    await page.mouse.down();
    const rows: Readonly<Record<string, string | number | boolean>>[] = [];
    for (const [x, y] of [
      [1250, 300],
      [180, 650],
      [1250, 650],
      [180, 300],
      [1250, 480],
      [180, 480],
    ]) {
      if (x === undefined || y === undefined) throw Error("crossing point");
      await page.mouse.move(x, y, { steps: 128 });
      const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!snapshot || snapshot.dropped) throw Error("missing crossing observation");
      rows.push(...snapshot.records);
    }
    await page.mouse.up();
    await complete(page, false, false, (records) => rows.push(...records));
    expect(rows.some((r) => r.kind === "stroke-count" && Number(r.count) >= 769)).toBe(true);
    const original = await page.screenshot({ clip });
    expect(original.equals(blank)).toBe(false);
    await clear(page);
    await page.locator("canvas").focus();
    await page.keyboard.down("Space");
    await page.mouse.move(900, 750);
    await page.mouse.down();
    await page.mouse.move(200, 750, { steps: 16 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.keyboard.up("Space");
    await complete(page);
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page, true);
    expect((await page.screenshot({ clip })).equals(blank)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    expect((await page.screenshot({ clip })).equals(original)).toBe(true);
    const final = await page.evaluate(() => window["__linefieldPerfRead"]?.());
    expect(final?.dropped).toBe(0);
    expect(final?.geometry.visibilityQueries).toBeGreaterThan(0);
    expect(final?.geometry.visibilityMaxHulls).toBeLessThanOrEqual(4);
    expect(errors).toEqual([]);
    await info.attach("actual-route-crossings", {
      body: JSON.stringify({ final, counts: rows.filter((r) => r.kind === "stroke-count") }),
      contentType: "application/json",
    });
  });
