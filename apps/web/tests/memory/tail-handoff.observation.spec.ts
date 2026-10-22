import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true]) {
  test(`MIG-LIVE-05 ended construction hands scratch to fresh stroke and preserves cancellation (${packed ? "packed" : "R8"})`, async ({
    page,
  }) => {
    if (packed) await forcePackedTargets(page);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await page.locator("input[type=range]").focus();
    await page.keyboard.press("End");
    await page.mouse.move(900, 550);
    await page.mouse.wheel(0, 100000);
    await expect(page.locator(".canvas-footer")).toContainText("5%");
    await clear(page);
    await page.mouse.move(250, 300);
    await page.mouse.down();
    await complete(page, false, true);
    let pending = false;
    for (let i = 1; i <= 384 && !pending; i++) {
      await page.mouse.move(650 + Math.sin(i * 0.11) * 420, 450 + Math.sin(i * 0.22) * 210);
      const records = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!records || records.dropped) throw Error("observation unavailable");
      for (const r of records.records) {
        if (r.kind === "live-tail" && r.phase === "capture" && Number(r.count) > 32) pending = true;
        if (r.kind === "live-tail" && r.phase === "publish") pending = false;
      }
    }
    expect(pending, "pending tail construction observed before End").toBe(true);
    await page.mouse.up();
    await page.mouse.move(300, 700);
    await page.mouse.down();
    await page.mouse.move(900, 700, { steps: 12 });
    const records = await page.evaluate(() => window["__linefieldPerfRead"]?.());
    expect(records?.dropped).toBe(0);
    expect(records?.records.some((r) => r.kind === "live-tail" && r.phase === "stop")).toBe(true);
    await clear(page);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await complete(page);
    const clip = { x: 200, y: 220, width: 800, height: 520 };
    const onlyC = await page.screenshot({ clip });
    await page.mouse.move(500, 450);
    await page.keyboard.down("Space");
    await page.mouse.down();
    await page.mouse.move(570, 490);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await page.keyboard.up("Space");
    await expect.poll(async () => (await page.screenshot({ clip })).equals(onlyC)).toBe(true);
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(onlyC)).toBe(false);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    expect((await page.screenshot({ clip })).equals(onlyC)).toBe(true);
    await page.mouse.move(300, 750);
    await page.mouse.down();
    await page.mouse.move(900, 750, { steps: 12 });
    await page.mouse.up();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    expect(errors).toEqual([]);
  });
}
