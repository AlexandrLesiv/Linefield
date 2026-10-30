import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { drawingDigest, ready } from "./vector-saving-capacity-helpers.mjs";
import { documentSnapshot } from "./vector-saving-capacity-document.mjs";
export { ready };
export async function snapshot(frame) {
  const document = await documentSnapshot(frame);
  delete document.active; // Existing reload policy selects the first ordered layer.
  return { drawing: await drawingDigest(frame), document };
}
export async function createDrawing(page, url) {
  await page.goto(url);
  await page.locator(".new-tile").click();
  const frame = await ready(page),
    id = new URL(page.url()).pathname.split("/").at(-1);
  await frame.locator("#layers-toggle").click();
  await frame.locator("#layer-add").click();
  await frame.locator("#layer-add").click();
  const hidden = frame.locator('[data-layer-id="1"]');
  await hidden.locator('[data-layer-action="1-visibility"]').click();
  await hidden.locator('[data-layer-action="1-locked"]').click();
  await hidden.locator(".layer-actions button").nth(2).click();
  await hidden.locator("input").fill("Hidden paper · Київ");
  await hidden.locator("input").press("Enter");
  await frame.locator('[data-layer-id="2"] .layer-actions button').nth(1).click();
  await frame.locator('[data-layer-id="0"] .layer-name').click();
  await frame.locator("#layers-close").click();
  const settingsHidden = !(await frame.locator("#paper-style").isVisible());
  if (settingsHidden) await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#paper-style").selectOption("white");
  await frame.locator("#grid-style").selectOption("notebook");
  if (settingsHidden) await frame.locator("#grid-style").press("Escape");
  const box = await frame.locator("canvas").boundingBox();
  assert(box);
  for (let brush = 0; brush < 3; brush++) {
    await frame.locator("#brush").selectOption(String(brush));
    await frame.locator("#width").focus();
    await frame.locator("#width").press("End");
    await page.mouse.move(box.x + 150, box.y + 210 + brush * 110);
    await page.mouse.down();
    await page.mouse.move(box.x + 380, box.y + 235 + brush * 110, { steps: 30 });
    await page.mouse.up();
  }
  await frame.evaluate(() => lab.saving.flush(true));
  await page.mouse.move(5, 5);
  await frame.evaluate(() => document.activeElement?.blur());
  await frame.waitForFunction(() => !lab.renderPending());
  assert.equal(
    await frame.evaluate(() => lab.core.count()),
    3,
    "Fixture must retain all three brush strokes",
  );
  return {
    id,
    frame,
    raw: await snapshot(frame),
    pixels: await frame.locator("canvas").screenshot(),
  };
}
export async function back(page) {
  await page.goBack();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.waitForFunction(() => !document.querySelector("main.gallery")?.inert);
}
export async function sameDrawing(page, expected) {
  const frame = await ready(page);
  assert.deepEqual(await snapshot(frame), expected.raw);
  await page.mouse.move(5, 5);
  await frame.evaluate(() => document.activeElement?.blur());
  await frame.waitForFunction(() => !lab.renderPending());
  const actual = await frame.locator("canvas").screenshot();
  if (!actual.equals(expected.pixels)) {
    const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save08-image-mismatch";
    await mkdir(output, { recursive: true });
    await writeFile(output + "/expected.png", expected.pixels);
    await writeFile(output + "/actual.png", actual);
  }
  assert.equal(
    actual.equals(expected.pixels),
    true,
    "Saved drawing canvas pixels changed; see evidence PNGs",
  );
}
