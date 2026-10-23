import { test, expect } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { installCandidateTurnHold } from "./candidate-turn-hold.ts";
import { forcePackedTargets } from "./packed-targets.ts";
import { compositionEdges } from "./composition-edges.ts";
import type { Page } from "@playwright/test";
type Row = Readonly<Record<string, string | number | boolean>>;
const clip = { x: 180, y: 200, width: 920, height: 550 };
async function begin(page: Page, key: string) {
  await page.locator("canvas").focus();
  await page.keyboard.down(key);
  await page.mouse.move(1000, 450);
  await page.mouse.down();
}
async function reset(page: Page) {
  await clear(page);
  await page.getByRole("button", { name: "Reset view", exact: true }).click();
  await complete(page);
}
for (const packed of [false, true])
  test(`MIG-PAN-REVEAL-05 consecutive forced provisional compositions (${packed ? "packed" : "R8"})`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(60_000);
    if (packed) await forcePackedTargets(page);
    await installCandidateTurnHold(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    await page.mouse.move(550, 350);
    await page.mouse.down();
    await page.mouse.move(800, 580, { steps: 48 });
    await page.mouse.up();
    await complete(page);
    const original = await page.screenshot({ clip });
    const rows: Row[] = [];
    const read = async () => {
      const value = await page.evaluate(() => window["__linefieldPerfRead"]?.());
      if (!value || value.dropped) throw Error("observation unavailable/overflow");
      rows.push(...value.records);
    };
    try {
      for (const key of ["Space", "r"]) {
        const points =
          key === "Space"
            ? [
                [900.375, 470.625],
                [1080.625, 420.375],
                [920.125, 480.875],
                [1030.875, 430.125],
              ]
            : [
                [900.375, 600.625],
                [750.625, 750.375],
                [930.125, 550.875],
                [820.875, 680.125],
              ];
        const references: Buffer[] = [];
        for (const point of points) {
          await reset(page);
          await begin(page, key);
          await page.mouse.move(point[0] ?? 0, point[1] ?? 0);
          await clear(page);
          await page.mouse.up();
          await page.keyboard.up(key);
          await complete(page, false, false, (records) => rows.push(...records));
          references.push(await page.screenshot({ clip }));
        }
        await reset(page);
        await clear(page);
        await begin(page, key);
        await page.evaluate(() => {
          document.documentElement.dataset.holdCandidateTurn = "true";
        });
        const start = rows.length;
        await page.mouse.move(points[0]?.[0] ?? 0, points[0]?.[1] ?? 0);
        const candidates = new Set<string>();
        for (let index = 1; index < points.length; index++) {
          await expect
            .poll(async () => {
              await read();
              return rows
                .slice(start)
                .some((r) => r.kind === "frame-batch" && !candidates.has(`${r.receipt}`));
            })
            .toBe(true);
          for (const r of rows.slice(start))
            if (r.kind === "frame-batch") candidates.add(`${r.receipt}`);
          await expect
            .poll(async () =>
              Number(await page.locator("html").getAttribute("data-candidate-turns")),
            )
            .toBeGreaterThan(0);
          await page.mouse.move(points[index]?.[0] ?? 0, points[index]?.[1] ?? 0);
          await expect
            .poll(async () => {
              await read();
              const count = rows
                .slice(start)
                .filter(
                  (r) => r.kind === "coverage-transition" && r.phase === "view-consume",
                ).length;
              if (count < index)
                await page.evaluate(() => document.dispatchEvent(new Event("step-candidate-turn")));
              return count;
            })
            .toBe(index);
          const actual = await page.screenshot({ clip }),
            reference = references[index];
          if (!reference) throw Error("reference");
          const edges = await compositionEdges(page, actual, reference);
          await info.attach(`${key}-${index}-provisional`, {
            body: actual,
            contentType: "image/png",
          });
          await info.attach(`${key}-${index}-canonical`, {
            body: reference,
            contentType: "image/png",
          });
          await info.attach(`${key}-${index}-edge-measurement`, {
            body: JSON.stringify(edges),
            contentType: "application/json",
          });
          expect(edges.ink).toBeGreaterThan(0);
          expect(edges.measuredRows).toBeGreaterThan(20);
        }
        await read();
        const chain = rows.slice(start);
        const unions = chain.filter(
          (r) => r.kind === "coverage-transition" && r.phase === "view-consume",
        );
        expect(unions).toHaveLength(3);
        expect(new Set(unions.map((r) => r.mapping)).size).toBe(3);
        for (const union of unions) {
          const replacement = chain
            .slice(chain.indexOf(union) + 1)
            .find((r) => r.kind === "frame-batch");
          expect(replacement, "replacement candidate issued at union anchor").toBeDefined();
          for (const field of ["owner", "session", "mapping", "content"])
            expect(replacement?.[field]).toBe(union[field]);
        }
        expect(chain.some((r) => r.kind === "receipt-ack")).toBe(false);
        expect(
          chain.filter(
            (r) => r.kind === "receipt-publish" && !unions.some((u) => u.receipt === r.receipt),
          ),
        ).toEqual([]);
        await clear(page);
        if (key === "r") await page.keyboard.press("Escape");
        await page.mouse.up();
        await page.keyboard.up(key);
        await page.evaluate(() => document.dispatchEvent(new Event("release-candidate-turn")));
        await complete(page);
        expect(
          (await page.screenshot({ clip })).equals(
            key === "r" ? original : (references.at(-1) ?? Buffer.alloc(0)),
          ),
        ).toBe(true);
        await reset(page);
      }
    } finally {
      await info.attach("controlled-chain", {
        body: JSON.stringify({
          browser: browser.version(),
          packed,
          rows,
          evidence:
            "real route with bounded task stepping; edge measurements require review, no timing claim",
        }),
        contentType: "application/json",
      });
    }
  });
