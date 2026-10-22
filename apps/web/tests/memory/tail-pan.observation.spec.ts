import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
for (const packed of [false, true]) {
  test(`MIG-LIVE-07 forced budget exhaustion preserves ended front during pre-promotion pan (${packed ? "packed" : "R8"})`, async ({
    page,
  }, info) => {
    if (packed) await forcePackedTargets(page);
    await page.addInitScript(() => {
      const now = performance.now.bind(performance);
      let offset = 0,
        calls = 0;
      Object.defineProperty(performance, "now", {
        value: () => {
          if (document.documentElement.dataset.exhaustLiveBudget === "true") {
            if (++calls > 512) throw Error("bounded budget fixture exhausted");
            offset += 3;
          }
          return now() + offset;
        },
      });
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await clear(page);
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(650, 450, { steps: 32 });
    const front: Readonly<Record<string, string | number | boolean>>[] = [];
    await complete(page, false, true, (rows) => front.push(...rows));
    expect(
      front.some(
        (r) => r.kind === "live-tail" && r.phase === "publish" && r.count === "33" && r.exact,
      ),
    ).toBe(true);
    const clip = { x: 250, y: 250, width: 500, height: 250 };
    const original = await page.screenshot({ clip });
    await clear(page);
    await page.evaluate(() => {
      document.documentElement.dataset.exhaustLiveBudget = "true";
    });
    try {
      await page.mouse.move(680, 470);
      await page.mouse.up();
      await page.mouse.move(800, 600);
      await page.keyboard.down("Space");
      await page.mouse.down();
      await page.mouse.move(860, 640);
      await expect
        .poll(async () =>
          (await page.screenshot({ clip: { ...clip, x: clip.x + 60, y: clip.y + 40 } })).equals(
            original,
          ),
        )
        .toBe(true);
      const held = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      expect(held?.dropped).toBe(0);
      expect(
        held?.records.some(
          (r) =>
            r.kind === "live-tail" &&
            r.phase === "ended" &&
            r.count === "34" &&
            Number(r.through) < 34 &&
            !r.exact,
        ),
      ).toBe(true);
      expect(
        held?.records.filter(
          (r) => r.kind === "receipt-ack" || (r.kind === "overlay-submit" && r.complete),
        ),
      ).toEqual([]);
      await info.attach("forced-budget-control", {
        body: JSON.stringify(held),
        contentType: "application/json",
      });
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await page.keyboard.up("Space");
      await expect.poll(async () => (await page.screenshot({ clip })).equals(original)).toBe(true);
    } finally {
      await page.evaluate(() => {
        document.documentElement.dataset.exhaustLiveBudget = "false";
      });
    }
    await clear(page);
    await page.getByRole("button", { name: "Reset view", exact: true }).click();
    await complete(page);
    const settled = await page.screenshot({ clip });
    await clear(page);
    await page.getByRole("button", { name: "Undo last action", exact: true }).click();
    await complete(page);
    await clear(page);
    await page.getByRole("button", { name: "Redo last action", exact: true }).click();
    await complete(page, true);
    expect((await page.screenshot({ clip })).equals(settled)).toBe(true);
  });
}
