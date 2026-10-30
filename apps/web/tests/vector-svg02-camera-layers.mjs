import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { digest } from "./vector-saving-recovery-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated SVG02 product preview required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1000, height: 850 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab && !!document.querySelector("#svg-export-open"));
  await frame.evaluate(() => {
    const c = lab.core;
    c.begin_fixed_width(12, 0x235588, 0.7);
    c.push_precise(20, 40, 1);
    c.push_precise(180, 120, 1);
    c.commit();
    lab.requestRedraw();
  });
  const exportSvg = async () => {
    const before = await digest(frame);
    const history = await frame.evaluate(() => [lab.core.can_undo(), lab.core.can_redo()]);
    await frame.locator("#editor-settings-toggle").click();
    await frame.locator("#svg-export-open").click();
    await frame.locator("#svg-background").selectOption("transparent");
    await frame.locator("#svg-density").selectOption("2");
    await frame.locator("#svg-export-start").click();
    await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 60000 });
    const svg = await frame.evaluate(async () =>
      (await fetch(document.querySelector("#svg-export-download").href)).text(),
    );
    assert.equal(await digest(frame), before);
    assert.deepEqual(
      await frame.evaluate(() => [lab.core.can_undo(), lab.core.can_redo()]),
      history,
    );
    return {
      bytes: svg.length,
      sha: createHash("sha256").update(svg).digest("hex"),
      images: (svg.match(/<image /g) ?? []).length,
      viewBox: svg.match(/viewBox="([^"]+)"/)[1],
    };
  };
  const baseline = await exportSvg();
  assert.equal(baseline.images, 1);
  const layers = await frame.evaluate(() => {
    const c = lab.core,
      visible = c.layer_active();
    c.layer_set_locked(visible, 1);
    const hidden = c.layer_create();
    c.begin_fixed_width(50, 0xaa3311, 1);
    c.push_precise(100000, 100000, 1);
    c.push_precise(100050, 100050, 1);
    c.commit();
    c.layer_set_visible(hidden, 0);
    const transparent = c.layer_create();
    c.begin_fixed_width(50, 0x11aa33, 0);
    c.push_precise(200000, 200000, 1);
    c.push_precise(200050, 200050, 1);
    c.commit();
    lab.requestRedraw();
    return {
      visible,
      hidden,
      transparent,
      count: c.count(),
      locked: c.layer_locked(visible),
      hiddenVisible: c.layer_visible(hidden),
      zeroOpacity: c.opacity(c.count() - 1),
    };
  });
  assert.equal(layers.count, 3);
  assert.equal(layers.locked, 1);
  assert.equal(layers.hiddenVisible, 0);
  assert.equal(layers.zeroOpacity, 0);
  assert.deepEqual(
    await exportSvg(),
    baseline,
    "locked visible retained; hidden and zero-opacity content excluded from image and bounds",
  );
  const beforeCamera = await frame.evaluate(() => lab.view());
  const box = await frame.locator("canvas").first().boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.down("Space");
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await page.mouse.wheel(0, 280);
  await page.waitForTimeout(250);
  await page.keyboard.down("r");
  await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 120, { steps: 12 });
  await page.mouse.up();
  await page.keyboard.up("r");
  await frame.waitForFunction(() => !lab.renderPending());
  await page.waitForTimeout(200);
  const afterCamera = await frame.evaluate(() => lab.view());
  assert.notEqual(afterCamera.zoom, beforeCamera.zoom);
  assert.notEqual(afterCamera.rotation, beforeCamera.rotation);
  assert.ok(afterCamera.cx !== beforeCamera.cx || afterCamera.cy !== beforeCamera.cy);
  assert.deepEqual(await exportSvg(), baseline, "camera changes do not change SVG bytes");
  await frame.evaluate(() => {
    const c = lab.core;
    c.begin_fixed_width(8, 0x336699, 1);
    c.push_precise(1000000, 1000000, 1);
    c.push_precise(1000100, 1000100, 1);
    c.commit();
  });
  const beforeOversize = await digest(frame);
  const oversizeHistory = await frame.evaluate(() => [lab.core.can_undo(), lab.core.can_redo()]);
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#svg-export-open").click();
  await frame.locator("#svg-export-start").click();
  await frame.waitForFunction(() => !document.querySelector("#svg-export-open").disabled);
  assert.equal(await frame.locator("#svg-export-download").isVisible(), false);
  const oversizeMessage = await frame.locator("#svg-export-notice [role=status]").textContent();
  assert.match(oversizeMessage, /current size limit/);
  assert.equal(await digest(frame), beforeOversize);
  assert.deepEqual(
    await frame.evaluate(() => [lab.core.can_undo(), lab.core.can_redo()]),
    oversizeHistory,
  );
  await page.keyboard.press("Meta+z");
  assert.deepEqual(await exportSvg(), baseline, "retry after undoing oversized content succeeds");
  await frame.evaluate(() => lab.saving.flush(true));
  const result = {
    baseline,
    layers,
    beforeCamera,
    afterCamera,
    rawAndHistoryPreserved: true,
    cameraInput: "actual browser Space-drag, wheel, R-drag",
    syntheticCanonicalLayerSeeding: true,
    oversizeMessage,
    oversizePreservedDataAndHistory: true,
  };
  writeFileSync(
    process.env.LINEFIELD_REPORT ?? ".build-cache/svg02/camera-layers.json",
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
