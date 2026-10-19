import { test, expect } from "@playwright/test";
import { inkBounds } from "./pixel-bounds.ts";
import {
  open,
  ready,
  stroke,
  holdFrames,
  releaseFrames,
  rotationClick,
  diagnostics,
} from "./rotation-helpers.ts";
test("WMP-11 rotation buttons preserve original raster through24 held-frame steps and reset", async ({
  page,
  context,
}, info) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const center = await open(page);
  const clip = { x: center.x - 250, y: center.y - 250, width: 500, height: 500 };
  await stroke(page, center.x - 130, center.y - 60);
  await stroke(page, center.x + 70, center.y + 45, -16, 45);
  await ready(page);
  const original = await page.screenshot({ clip });
  const beforeCounters = await diagnostics(page);
  await holdFrames(page);
  for (let step = 1; step <= 24; step++) {
    await rotationClick(page, "right");
    const angle = (step % 24 >= 12 ? (step % 24) - 24 : step % 24) * 15;
    await expect(page.locator('[data-memory-rotation="reset"]')).toHaveText(`${angle}°`);
    if (step === 1) {
      expect((await page.screenshot({ clip })).equals(original)).toBe(false);
      await page.screenshot({ path: info.outputPath("immediate15.png") });
    }
  }
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await rotationClick(page, "left");
  await rotationClick(page, "reset");
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  const heldCounters = await diagnostics(page);
  expect(heldCounters.render.snapshotCount).toBe(beforeCounters.render.snapshotCount);
  expect(heldCounters.render.peakImages).toBeLessThanOrEqual(2);
  expect(
    heldCounters.render.panPreviewPublications - beforeCounters.render.panPreviewPublications,
  ).toBe(26);
  await info.attach("held-affine-resource-counters", {
    body: JSON.stringify({ beforeCounters, heldCounters }),
    contentType: "application/json",
  });
  await rotationClick(page, "reset");
  await releaseFrames(page);
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await expect(page.locator('[data-memory-rotation="reset"]')).toBeFocused();
  await page.locator("[data-memory-diagnostics]").click();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  const log: { runtime: { records: { command: string; outcome: string }[] } } = JSON.parse(copied);
  expect(log.runtime.records.length).toBeLessThanOrEqual(100);
  for (const outcome of ["ok", "noop"])
    expect(
      log.runtime.records.some(
        (record) => record.command === "rotate-step" && record.outcome === outcome,
      ),
    ).toBe(true);
  for (const record of log.runtime.records)
    expect(Object.keys(record).sort()).toEqual([
      "command",
      "event",
      "outcome",
      "request",
      "session",
      "time",
    ]);
  await info.attach("rotation-diagnostics", { body: copied, contentType: "application/json" });
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
  expect((await inkBounds(page, clip)).maxX).toBe(-1);
});
test("WMP-04/11 rotated input, pan, zoom, Back and reset preserve ink and history", async ({
  page,
}, info) => {
  const center = await open(page);
  const clip = { x: center.x - 200, y: center.y - 200, width: 400, height: 400 };
  await rotationClick(page, "right");
  await ready(page);
  await stroke(page, center.x - 60, center.y - 30, 120, 60);
  await ready(page);
  const bounds = await inkBounds(page, clip);
  expect(Math.abs(bounds.minX - 136)).toBeLessThanOrEqual(1);
  expect(Math.abs(bounds.maxX - 263)).toBeLessThanOrEqual(1);
  const original = await page.screenshot({ clip });
  await page.locator('[data-memory-zoom="in"]').click();
  await ready(page);
  await page.locator('[data-memory-zoom="out"]').click();
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await page.locator("[data-memory-canvas]").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(center.x, center.y + 100);
  await page.mouse.down();
  await page.mouse.move(center.x + 40, center.y + 125);
  const held = await inkBounds(page, clip);
  expect(held.minX - bounds.minX).toBe(40);
  expect(held.minY - bounds.minY).toBe(25);
  await expect(page.locator('[data-memory-rotation="right"]')).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await page.keyboard.up("Space");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await page.locator(".back").click();
  await expect(page.locator(".drawing-surface")).toHaveCount(0);
  await page.locator(".new-tile").click();
  await ready(page);
  await expect(page.locator('[data-memory-rotation="reset"]')).toHaveText("15°");
  expect((await page.screenshot({ clip })).equals(original)).toBe(true);
  await rotationClick(page, "reset");
  await ready(page);
  expect((await page.screenshot({ clip })).equals(original)).toBe(false);
  await page.screenshot({ path: info.outputPath("rotated-ink-reset.png") });
  await page.locator("[data-memory-undo]").click();
  await ready(page);
  expect((await inkBounds(page, clip)).maxX).toBe(-1);
  await expect(page.locator("[data-memory-undo]")).toBeDisabled();
});
