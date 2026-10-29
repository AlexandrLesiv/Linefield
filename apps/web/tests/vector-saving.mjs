import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated preview URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save05-app";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [],
  context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 2,
  });
const page = await context.newPage();
page.on("dialog", (d) => d.accept());
async function open() {
  await page.goto(new URL("drawing/preview-new", url).href);
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab, { timeout: 30000 });
  return frame;
}
async function snapshot(f) {
  return f.evaluate(() => {
    const e = lab.core;
    return {
      paper: e.document_paper(),
      grid: e.document_grid(),
      layers: Array.from({ length: e.layer_count() }, (_, rank) => {
        const id = e.layer_at(rank);
        return [
          id,
          e.layer_visible(id),
          e.layer_locked(id),
          new TextDecoder().decode(
            new Uint8Array(e.memory.buffer, e.layer_name_ptr(id), e.layer_name_len(id)),
          ),
        ];
      }),
      strokes: Array.from({ length: e.count() }, (_, id) => id)
        .filter((id) => e.raw_length(id) > 0)
        .map((id) => ({
          id,
          visible: e.visible(id),
          layer: e.stroke_layer(id),
          brush: e.brush(id),
          width: e.stroke_width(id),
          color: e.color(id),
          opacity: e.opacity(id),
          transform: Array.from({ length: 4 }, (_, i) => e.stroke_transform(id, i)),
          raw: Array.from({ length: e.raw_length(id) }, (_, i) => [
            String(e.raw_region(id, i, 0)),
            e.raw_local(id, i, 0),
            String(e.raw_region(id, i, 1)),
            e.raw_local(id, i, 1),
            e.raw_point(id, i, 2),
          ]),
        })),
    };
  });
}
async function flush(f) {
  await f.evaluate(() => lab.saving.flush(true));
}
try {
  let f = await open();
  for (let cycle = 0; cycle < 3; cycle++) {
    await f.evaluate((iteration) => {
      const e = lab.core;
      for (let brush = 0; brush < 3; brush++) {
        e.begin_with_style(15, 0x245788, 0.15, 1.8, 0.65);
        e.set_active_brush(brush);
        for (let i = 0; i < 120; i++)
          e.push_precise(
            100 + i * 2,
            150 + iteration * 70 + brush * 25 + Math.sin(i / 6) * 10,
            0.2 + (i % 9) / 12,
          );
        e.commit();
      }
      e.document_settings(iteration % 3, (iteration + 1) % 3);
      lab.requestRedraw();
    }, cycle);
    await flush(f);
    const before = await snapshot(f);
    await f.waitForFunction(() => !lab.renderPending());
    const pixels = await f.locator("canvas").screenshot();
    f = await open();
    assert.deepEqual(await snapshot(f), before);
    await f.waitForFunction(() => !lab.renderPending());
    assert.deepEqual(await f.locator("canvas").screenshot(), pixels);
    results.push(`cycle-${cycle}: exact raw/settings and canvas image reload`);
  }
  // Only completed state is persisted. Save now must not manufacture a release.
  await f.evaluate(() => {
    const e = lab.core;
    e.begin(20, 0);
    e.push_precise(300, 400, 1);
  });
  const rev = await f.evaluate(() => String(lab.core.delta_revision()));
  await flush(f);
  assert.equal(await f.evaluate(() => String(lab.core.delta_revision())), rev);
  await f.evaluate(() => lab.core.cancel());
  results.push("manual flush excludes active gesture");
  const second = await context.newPage();
  await second.goto(new URL("drawing/preview-new", url).href);
  const sf = second.frameLocator("iframe");
  await sf.locator('[data-save-state="openInUse"]').waitFor();
  assert.equal(
    await second
      .frames()
      .find((x) => x.url().includes("/vector-editor/"))
      .evaluate(() => !!window.lab),
    false,
  );
  await second.close();
  results.push("second tab refused without editable blank");
  // Inject a storage error in the test process, not a shipped fault endpoint.
  let worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  await worker.evaluate(() => {
    const original = database.commit;
    database.commit = () => {
      throw Error("storage-capacity");
    };
    globalThis.originalCommit = original;
  });
  await f.evaluate(() => {
    lab.core.begin(8, 0);
    lab.core.push_precise(50, 50, 1);
    lab.core.commit();
  });
  assert.equal(
    await f.evaluate(() =>
      lab.saving.flush(true).then(
        () => false,
        () => true,
      ),
    ),
    true,
  );
  const retained = await snapshot(f);
  await f.locator('[data-save-state="capacity"]').waitFor();
  await f.locator("#save-action").click();
  await f.waitForFunction(() => lab.saving.state().phase === "saved");
  assert.deepEqual(await snapshot(f), retained);
  f = await open();
  assert.deepEqual(await snapshot(f), retained);
  results.push("storage failure retains input and retry/reload recovers exact revision");
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  results.push("controlled Back flushes and returns");
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { results, browser: browser.version(), viewport: [1200, 1000], dpr: 2 },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
}
