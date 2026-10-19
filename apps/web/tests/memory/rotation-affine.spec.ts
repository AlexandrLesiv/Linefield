import { test, expect } from "@playwright/test";
import { inkBounds } from "./pixel-bounds.ts";
import {
  open,
  ready,
  stroke,
  holdFrames,
  releaseFrames,
  rotationClick,
} from "./rotation-helpers.ts";
test.use({ deviceScaleFactor: 2 });
test("WMP-11 fractional DPR2 rotation-pan preview aligns three strokes with accurate frame", async ({
  page,
}, info) => {
  const center = await open(page);
  for (const [x, y] of [
    [-140, -100],
    [100, -80],
    [10, 100],
  ]) {
    await stroke(page, center.x + x!, center.y + y!, 16, 8);
    await ready(page);
  }
  await page.locator('[data-memory-zoom="in"]').click();
  await ready(page);
  await holdFrames(page);
  await rotationClick(page, "right");
  await page.locator("[data-memory-canvas]").focus();
  await page.keyboard.down("Space");
  await page.mouse.move(center.x, center.y + 150);
  await page.mouse.down();
  await page.mouse.move(center.x + 30.25, center.y + 170.25);
  await page.mouse.up();
  await page.keyboard.up("Space");
  await rotationClick(page, "right");
  const radians = Math.PI / 6;
  // Independent test locations use screen-center rotation and the pan's captured15° basis.
  const panX = Math.cos(Math.PI / 12) * 30.25 - Math.sin(Math.PI / 12) * 20.25;
  const panY = Math.sin(Math.PI / 12) * 30.25 + Math.cos(Math.PI / 12) * 20.25;
  const clips = [
    [-140, -100],
    [100, -80],
    [10, 100],
  ].map(([x, y]) => ({
    x: Math.floor(center.x + (Math.cos(radians) * x! - Math.sin(radians) * y!) * 1.25 + panX - 25),
    y: Math.floor(center.y + (Math.sin(radians) * x! + Math.cos(radians) * y!) * 1.25 + panY - 25),
    width: 90,
    height: 90,
  }));
  const preview = [];
  for (const clip of clips) preview.push(await inkBounds(page, clip));
  for (let i = 0; i < preview.length; i++) {
    const [x, y] = [
      [-140, -100],
      [100, -80],
      [10, 100],
    ][i]!;
    const expectedX = center.x + (Math.cos(radians) * x! - Math.sin(radians) * y!) * 1.25 + panX;
    const expectedY = center.y + (Math.sin(radians) * x! + Math.cos(radians) * y!) * 1.25 + panY;
    expect(Math.abs(preview[i]!.minX - ((expectedX - clips[i]!.x) * 2 - 10))).toBeLessThanOrEqual(
      2,
    );
    expect(Math.abs(preview[i]!.minY - ((expectedY - clips[i]!.y) * 2 - 10))).toBeLessThanOrEqual(
      2,
    );
  }
  await page.screenshot({ path: info.outputPath("rotated-preview-dpr2.png") });
  await releaseFrames(page);
  await ready(page);
  for (let i = 0; i < clips.length; i++) {
    const exact = await inkBounds(page, clips[i]!);
    for (const key of ["minX", "maxX", "minY", "maxY"] as const)
      expect(Math.abs(exact[key] - preview[i]![key])).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: info.outputPath("rotated-exact-dpr2.png") });
  await page.setViewportSize({ width: 1250, height: 850 });
  await ready(page);
  await expect(page.locator('[data-memory-rotation="reset"]')).toHaveText("30°");
});
