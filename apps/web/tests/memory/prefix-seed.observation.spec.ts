import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
type RecordValue = Readonly<Record<string, string | number | boolean>>;
for (const packed of [false, true])
  for (const settled of [false, true])
    test(`MIG-TILE-02 ordinary End seed ${settled ? "settle before next pen" : "immediate next pen"} Escape ${packed ? "packed" : "normal"}`, async ({
      page,
      browser,
    }, info) => {
      if (packed) await forcePackedTargets(page);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto("/");
      await page.locator(".new-tile").click();
      await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
      const clip = { x: 220, y: 220, width: 650, height: 350 };
      for (let i = 0; i < 8; i++) {
        await clear(page);
        await page.mouse.move(270 + i * 60, 270);
        await page.mouse.down();
        await page.mouse.move(290 + i * 60, 450, { steps: 8 });
        await page.mouse.up();
        await complete(page);
      }
      const prefix = await page.screenshot({ clip });
      const before = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
      expect(before).toBeDefined();
      await clear(page);
      await page.mouse.move(300, 510);
      await page.mouse.down();
      await page.mouse.move(780, 510, { steps: 8 });
      await page.mouse.up();
      const seeded: RecordValue[] = [];
      if (settled) {
        await complete(page, false, false, (records) => seeded.push(...records));
        const idle = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
        expect(idle?.prefixSeedCopies).toBeGreaterThan(before?.prefixSeedCopies ?? 0);
        expect(idle?.prefixSeedCompleted).toBeGreaterThan(before?.prefixSeedCompleted ?? 0);
        expect(idle?.prefixSeedSkippedSources).toBeGreaterThanOrEqual(
          (before?.prefixSeedSkippedSources ?? 0) + 8,
        );
      }
      const ended = settled ? await page.screenshot({ clip }) : undefined;
      // The immediate lane has no readiness/ack wait between End and the next Begin.
      await page.mouse.move(320, 330);
      await page.mouse.down();
      await page.mouse.move(760, 350, { steps: 5 });
      await page.keyboard.press("Escape");
      await page.mouse.up();
      await complete(page, false, false, (records) => seeded.push(...records));
      const after = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
      expect(after?.prefixSeedCompleted).toBeGreaterThan(before?.prefixSeedCompleted ?? 0);
      expect(after?.prefixSeedSkippedSources).toBeGreaterThanOrEqual(
        (before?.prefixSeedSkippedSources ?? 0) + 8,
      );
      const result = await page.screenshot({ clip });
      expect(result.equals(prefix)).toBe(false);
      if (ended) expect(result.equals(ended)).toBe(true);
      await clear(page);
      await page.getByRole("button", { name: "Rotate canvas right 15°", exact: true }).click();
      await complete(page);
      await clear(page);
      await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
      const rebuilt: RecordValue[] = [];
      await complete(page, true, false, (records) => rebuilt.push(...records));
      expect((await page.screenshot({ clip })).equals(result)).toBe(true);
      const commands = (log: RecordValue[]) =>
        log.reduce(
          (sum, r) =>
            sum + (r.kind === "frame-batch" && typeof r.commands === "number" ? r.commands : 0),
          0,
        );
      expect(commands(seeded)).toBeGreaterThan(0);
      expect(commands(rebuilt)).toBeGreaterThan(commands(seeded));
      await clear(page);
      await page.getByRole("button", { name: "Undo last action", exact: true }).click();
      await complete(page);
      expect((await page.screenshot({ clip })).equals(prefix)).toBe(true);
      await clear(page);
      await page.getByRole("button", { name: "Redo last action", exact: true }).click();
      await complete(page, true);
      expect((await page.screenshot({ clip })).equals(result)).toBe(true);
      await info.attach("prefix-seed-actual-route", {
        body: JSON.stringify({
          version: browser.version(),
          packed,
          settled,
          before,
          after,
          seeded,
          rebuilt,
        }),
        contentType: "application/json",
      });
    });
