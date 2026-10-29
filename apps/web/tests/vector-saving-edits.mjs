import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("isolated URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save05-edits";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const brush of [0, 1, 2]) {
    const p = await browser.newPage({
      viewport: { width: 1200, height: 1000 },
      deviceScaleFactor: 2,
    });
    async function open() {
      await p.goto(new URL("drawing/preview-new", url).href);
      await p.locator("iframe").waitFor();
      const f = p.frames().find((x) => x.url().includes("/vector-editor/"));
      await f.waitForFunction(() => !!window.lab);
      return f;
    }
    let f = await open();
    await f.evaluate((b) => {
      const e = lab.core;
      for (let k = 0; k < 3; k++) {
        e.begin_with_style(18, 0x995522, 0.2, 1.4, 0.5);
        e.set_active_brush(b);
        for (let i = 0; i < 60; i++) e.push_precise(100 + i * 4, 150 + k * 55, 0.3 + (i % 6) / 10);
        e.commit();
      }
      e.move_begin();
      e.move_add(0);
      e.transform_update(100, 150, 1.2, 0.15, 15, 20);
      e.move_commit();
      e.slice_begin(12, 0);
      e.slice_push(210, 170);
      e.slice_push(210, 280);
      e.slice_commit();
      const hidden = e.layer_create();
      e.begin_with_style(12, 0x125566, 0.1, 1.8, 0.7);
      e.set_active_brush(b);
      for (let i = 0; i < 20; i++) e.push_precise(350 + i * 3, 300, 0.5);
      e.commit();
      e.layer_set_visible(hidden, 0);
      e.layer_select(0);
      e.document_settings(2, 2);
      e.undo();
      e.redo();
      lab.requestRedraw();
    }, brush);
    await f.evaluate(() => lab.saving.flush(true));
    const snapshot = () =>
      f.evaluate(() => {
        const e = lab.core,
          t = e.save_capture();
        if (!t) throw Error("capture");
        const out = [];
        for (let s = 0; s < e.save_stream_count(t); s++) {
          const a = [];
          for (let c = 0; ; c++) {
            const n = e.save_chunk(t, s, c) >>> 0;
            if (n === 0xffffffff) throw Error("chunk");
            a.push(...new Uint8Array(e.memory.buffer, e.save_chunk_ptr(), n));
            if (n < 65520) break;
          }
          out.push(a);
        }
        e.save_release(t);
        return out;
      });
    const before = await snapshot();
    await f.waitForFunction(() => !lab.renderPending());
    const pixels = await f.locator("canvas").screenshot();
    f = await open();
    assert.deepEqual(await snapshot(), before);
    await f.waitForFunction(() => !lab.renderPending());
    assert.deepEqual(await f.locator("canvas").screenshot(), pixels);
    results.push(
      `brush${brush}: transforms/Slice/hidden layer/settings history canonical+pixel roundtrip`,
    );
    // Re-show the hidden layer after reopening: its retained original samples render identically.
    await f.evaluate(() => {
      const e = lab.core;
      e.layer_set_visible(e.layer_at(1), 1);
      lab.requestRedraw();
    });
    await f.evaluate(() => lab.saving.flush(true));
    const visible = await snapshot();
    f = await open();
    assert.deepEqual(await snapshot(), visible);
    results.push(`brush${brush}: hidden-layer reveal saved again`);
    await p.close();
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify({ results, browser: browser.version() }, null, 2),
  );
  console.log(results);
} finally {
  await browser.close();
}
