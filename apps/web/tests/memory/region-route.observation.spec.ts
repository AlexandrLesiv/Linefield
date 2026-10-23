import { regionLineage } from "./region-lineage.ts";
import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { clear, complete } from "./observed-frame.ts";
import { forcePackedTargets } from "./packed-targets.ts";
type Row = Readonly<Record<string, string | number | boolean>>;
async function stroke(page: Page, x: number, y: number) {
  await clear(page);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 4, y + 70);
  await page.mouse.up();
  await complete(page);
}
async function pan(page: Page, dx: number, rows: Row[]) {
  await clear(page);
  await page.locator("canvas").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(600, 400);
  await page.mouse.down();
  await page.mouse.move(600 + dx, 400);
  await page.mouse.up();
  await page.keyboard.up("Space");
  return complete(page, false, false, (value) => rows.push(...value));
}
async function certified(page: Page, rows: Row[], target: Row | undefined) {
  try {
    await expect
      .poll(async () => {
        const snapshot = await page.evaluate(() => window["__linefieldPerfRead"]?.());
        if (!snapshot || snapshot.dropped) throw Error("missing or overflowed observation");
        rows.push(...snapshot.records);
        return !!regionLineage(rows, target);
      })
      .toBe(true);
  } finally {
    await test.info().attach("pan-lineage", {
      body: JSON.stringify({ target, rows, lineage: regionLineage(rows, target) }),
      contentType: "application/json",
    });
  }
}
for (const packed of [false, true])
  test(`MIG-TILE-02/05/06 certified pan canonical live fold and empty dirty geometry ${packed ? "packed" : "normal"}`, async ({
    page,
    browser,
  }, info) => {
    test.setTimeout(180000);
    if (packed) await forcePackedTargets(page);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator(".new-tile").click();
    await expect(page.locator("canvas")).toHaveAttribute("data-state", "ready");
    for (let i = 0; i < 96; i++)
      await stroke(page, 300 + (i % 12) * 30, 300 + Math.floor(i / 12) * 20);
    await clear(page);
    await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
    await complete(page);
    const clip = { x: 200, y: 200, width: 800, height: 450 },
      rows: Row[] = [];
    const before = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
    await certified(page, rows, await pan(page, 24, rows));
    const after = await page.evaluate(() => window["__linefieldPerfRead"]?.().geometry);
    expect(after?.panCopies).toBe((before?.panCopies ?? 0) + 1);
    expect(after?.panSkippedDraws).toBeGreaterThanOrEqual((before?.panSkippedDraws ?? 0) + 96);
    const copied = await page.screenshot({ clip });
    await clear(page);
    await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(copied)).toBe(true);
    const mixedRows: Row[] = [];
    await certified(page, mixedRows, await pan(page, 8, mixedRows));
    const anchored = await page.screenshot({ clip });
    await clear(page);
    await page.mouse.move(350, 530);
    await page.mouse.down();
    await page.mouse.move(650, 540, { steps: 16 });
    expect((await page.screenshot({ clip })).equals(anchored)).toBe(false);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(anchored)).toBe(true);
    await stroke(page, 430, 510);
    const ended = await page.screenshot({ clip });
    expect(ended.equals(anchored)).toBe(false);
    const firstAfterEnd: Row[] = [];
    await pan(page, 8, firstAfterEnd);
    const nextRows: Row[] = [];
    await certified(page, nextRows, await pan(page, 8, nextRows));
    const final = await page.screenshot({ clip });
    await clear(page);
    await page.getByRole("button", { name: "Reset canvas rotation", exact: true }).click();
    await complete(page);
    expect((await page.screenshot({ clip })).equals(final)).toBe(true);
    await info.attach("certified-pan-route", {
      body: JSON.stringify({
        browser: browser.version(),
        packed,
        rows,
        nextRows,
        firstAfterEnd,
        mixedRows,
        before,
        after,
        evidence:
          "actual-route certified B and canonical live input rendering; independent command cap checked in boundary fixture",
      }),
      contentType: "application/json",
    });
  });
