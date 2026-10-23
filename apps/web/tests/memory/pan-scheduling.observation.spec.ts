import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { installCandidateTurnHold } from "./candidate-turn-hold.ts";
import { forcePackedTargets } from "./packed-targets.ts";
type Row = Readonly<Record<string, string | number | boolean>>;
for (const packed of [false, true])
  test(`MIG-PAN-REVEAL-06 eligible sealed End advances within one render (${packed ? "packed" : "R8"})`, async ({
    page,
    browser,
  }, info) => {
    if (packed) await forcePackedTargets(page);
    await installCandidateTurnHold(page);
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await page.mouse.move(550, 350);
    await page.mouse.down();
    await page.mouse.move(800, 580, { steps: 48 });
    await page.mouse.up();
    await complete(page);
    const rows: Row[] = [];
    const read = async () => {
      const value = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!value || value.dropped) throw Error("observation unavailable/overflow");
      rows.push(...value.records);
    };
    await clear(page);
    await page.keyboard.down("Space");
    await page.mouse.move(1000, 450);
    await page.mouse.down();
    await page.evaluate(() => {
      document.documentElement.dataset.holdCandidateTurn = "true";
    });
    try {
      await page.mouse.move(900, 450);
      await expect
        .poll(async () => {
          await read();
          return rows.some((r) => r.kind === "frame-batch");
        })
        .toBe(true);
      await expect
        .poll(async () => Number(await page.locator("html").getAttribute("data-candidate-turns")))
        .toBeGreaterThan(0);
      await page.mouse.move(1000, 450);
      await page.mouse.up();
      await page.keyboard.up("Space");
      await page.evaluate(() => document.dispatchEvent(new Event("release-candidate-turn")));
      await complete(page, false, false, (next) => rows.push(...next));
      const sealed = rows.findIndex((r) => r.kind === "coverage-transition" && r.phase === "seal");
      const consumed = rows.findIndex(
        (r, i) => i > sealed && r.kind === "coverage-transition" && r.phase === "consume",
      );
      expect(sealed).toBeGreaterThanOrEqual(0);
      expect(consumed).toBeGreaterThan(sealed);
      expect(rows.slice(sealed + 1, consumed).some((r) => r.kind === "overlay-submit")).toBe(false);
      const anchor = rows[consumed];
      const nextBatch = rows.slice(consumed + 1).find((r) => r.kind === "frame-batch");
      expect(nextBatch).toBeDefined();
      for (const field of ["owner", "session", "mapping", "content"])
        expect(nextBatch?.[field]).toBe(anchor?.[field]);
      expect(
        rows.filter((r) => r.kind === "coverage-transition" && r.phase === "consume"),
      ).toHaveLength(1);
    } finally {
      await info.attach("controlled-sealed-progress", {
        body: JSON.stringify({
          browser: browser.version(),
          packed,
          rows,
          evidence: "actual route candidate task hold; event-order assertion, no timing claim",
        }),
        contentType: "application/json",
      });
    }
  });
