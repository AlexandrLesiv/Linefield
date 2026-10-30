import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated candidate URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/text01/rotated-create";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const angle of [0.7, -0.8]) {
    const context = await browser.newContext({
        viewport: { width: 1200, height: 900 },
        deviceScaleFactor: 2,
      }),
      page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.locator(".new-tile").click();
    const frameOf = async () => {
      await page.frameLocator("iframe").locator("#text-tool").waitFor();
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      return frame;
    };
    let frame = await frameOf();
    const box = await frame.locator("canvas").boundingBox(),
      cx = box.x + box.width / 2,
      cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.wheel(0, -300);
    await page.keyboard.down("r");
    await page.mouse.move(cx + 150, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 150 * Math.cos(angle), cy + 150 * Math.sin(angle), { steps: 20 });
    await page.mouse.up();
    await page.keyboard.up("r");
    const opening = await frame.evaluate(() => lab.view());
    assert.ok(Math.abs(opening.rotation) > 0.2);
    await frame.locator("#text-tool").click();
    const target = { x: box.width / 2 + 20, y: box.height / 2 + 40 };
    await frame.locator("canvas").click({ position: target });
    await frame.locator("#text-input").fill("Upright label");
    await frame.locator("#text-done").click();
    await frame.locator("#text-editor").waitFor({ state: "hidden" });
    await frame.waitForFunction(() => !lab.textStatus().queued && !lab.renderPending());
    const read = () =>
      frame.evaluate(() => {
        const c = lab.core,
          o = lab.viewOrigin();
        c.text_read(0x40000000, BigInt(o[0]), 0, BigInt(o[1]), 0);
        return {
          v: Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)),
          view: lab.view(),
          rev: String(c.delta_revision()),
        };
      });
    const created = await read(),
      v = created.v,
      view = created.view;
    assert.ok(
      Math.abs(Math.atan2(v[12], v[11]) + opening.rotation) < 1e-10,
      "screen-upright basis",
    );
    assert.ok(Math.abs(Math.hypot(v[11], v[12]) - 1) < 1e-12, "natural scale independent of zoom");
    const center = (d) => [
      d[9] + (d[11] * d[13] - d[12] * d[14]) / 2,
      d[10] + (d[12] * d[13] + d[11] * d[14]) / 2,
    ];
    const world = center(v),
      screen = [
        view.cx +
          view.zoom * (Math.cos(view.rotation) * world[0] - Math.sin(view.rotation) * world[1]),
        view.cy +
          view.zoom * (Math.sin(view.rotation) * world[0] + Math.cos(view.rotation) * world[1]),
      ];
    assert.ok(
      screen.every((n, i) => Math.abs(n - [target.x, target.y][i]) < 1e-6),
      "click center retained",
    );
    await frame.locator("canvas").focus();
    await page.keyboard.press("Control+z");
    assert.equal((await read()).v[7], 0, "one undo hides creation");
    await page.keyboard.press("Control+Shift+z");
    assert.deepEqual((await read()).v, v, "redo restores exact orientation");
    await frame.locator("#text-edit").click();
    await frame.locator("#text-input").fill("Longer edited label stays upright");
    await frame.locator("#text-done").click();
    await frame.locator("#text-editor").waitFor({ state: "hidden" });
    const edited = await read();
    assert.deepEqual(edited.v.slice(11, 13), v.slice(11, 13), "edit preserves basis");
    assert.ok(
      center(edited.v).every((n, i) => Math.abs(n - world[i]) < 1e-8),
      "edit preserves center",
    );
    await frame.locator("canvas").focus();
    await page.keyboard.press("Control+s");
    await frame.waitForFunction(() => lab.saving.state().phase === "saved", null, {
      timeout: 60000,
    });
    await page.screenshot({ path: `${output}/${angle}-upright-before-reload.png` });
    await page.reload();
    frame = await frameOf();
    await frame.waitForFunction(() => lab.core.text_count() === 1);
    const saved = await read();
    assert.deepEqual(saved.v, edited.v, "saved regional transform and label exact");
    assert.equal(errors.length, 0);
    await page.screenshot({ path: `${output}/${angle}.png` });
    results.push({
      angle,
      openingRotation: opening.rotation,
      basis: v.slice(11, 13),
      center: screen,
      saved: true,
    });
    await context.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ cases: results.length, results }));
} finally {
  await browser.close();
}
