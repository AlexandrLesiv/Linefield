import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { installReplay } from "./vector-saving-streaming-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit rebuilt streaming-decoder candidate required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1200, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await context.newPage(),
  results = [];
page.on("dialog", (d) => d.accept());
try {
  await clients(page, url);
  const library = await newClient(page),
    document = crypto.randomUUID();
  await call(page, library, "library-create", { document, locale: "en" });
  await kill(page, library);
  await page.goto(new URL(`vector-editor/?document=${document}`, url).href);
  await page.waitForFunction(() => !!globalThis.lab);
  await page.evaluate(async () => {
    const e = lab.core;
    for (let brush = 0; brush < 3; brush++) {
      e.begin_with_style(12, 0x315a93, 0.1, 1.5, 0.7);
      e.set_active_brush(brush);
      for (let i = 0; i < 1700; i++)
        e.push_precise(100 + i / 3, 150 + brush * 80 + Math.sin(i / 9) * 10, 0.2 + (i % 7) / 10);
      e.commit();
      await lab.saving.flush(true);
    }
    e.document_settings(2, 2);
    lab.requestRedraw();
    await lab.saving.flush(true);
  });
  const worker = page.workers().find((w) => w.url().includes("saving/worker.js"));
  const batches = await worker.evaluate(async () => {
    const loaded = await database.load(),
      out = [];
    for (const b of loaded.batches) {
      const streams = [];
      for (let stream = 0; stream < b.streams; stream++) {
        const bytes = [];
        let last = false,
          chunk = 0;
        while (!last) {
          const part = database.read(b.operation, stream, chunk++);
          for (const byte of part.bytes) bytes.push(byte);
          last = part.last;
        }
        streams.push(bytes);
      }
      out.push({ ...b, streams });
    }
    return out;
  });
  await page.evaluate(() => lab.saving.close());
  await page.waitForFunction(() => !lab.renderPending());
  const pixels = await page.locator("canvas").screenshot();
  assert(batches.length >= 3);
  await installReplay(page, batches);
  const original = await page.evaluate(() => rawState());
  for (const fragment of [1, 7, 39, 40, 41, 65519, 65520]) {
    assert.equal(
      await page.evaluate(async (size) => {
        const e = lab.core,
          t = e.restore_begin();
        const ok = feed(t, size);
        if (!ok) return false;
        const before = rawState();
        const cancelled = e.restore_cancel(t);
        return (
          cancelled === 1 &&
          e.restore_publish(t) === 0 &&
          before === rawState() &&
          e.restore_begin() === 0 &&
          (await drainReplay(t))
        );
      }, fragment),
      true,
    );
    assert.equal(await page.evaluate(() => rawState()), original);
  }
  results.push(
    "byte/sample/65520 boundaries parse successfully; unpublished cancellation preserves live model",
  );
  for (const kind of [
    "bad-header",
    "truncated",
    "changed-replay",
    "missing-replay",
    "second-batch",
  ]) {
    assert.equal(
      await page.evaluate(async (mode) => {
        const e = lab.core,
          t = e.restore_begin();
        const ok = feed(t, 7, mode);
        return (
          !ok &&
          e.restore_publish(t) === 0 &&
          e.restore_batch_begin(t, 1, 0n, 1n) === 0 &&
          e.restore_cancel(t) === 1 &&
          (await drainReplay(t))
        );
      }, kind),
      true,
    );
    assert.equal(await page.evaluate(() => rawState()), original);
  }
  results.push(
    "malformed, truncated, changed/missing replay and second-batch failure poison whole unpublished session; live model retained",
  );
  assert.equal(
    await page.evaluate(async () => {
      const e = lab.core,
        old = e.restore_begin();
      if (e.restore_begin() !== 0 || e.restore_cancel(old) !== 1 || !(await drainReplay(old)))
        return false;
      const current = e.restore_begin();
      return (
        e.restore_cancel(old) === 0 &&
        feed(current, 39) &&
        e.restore_publish(current) === 1 &&
        (await drainReplay(current))
      );
    }),
    true,
  );
  assert.equal(await page.evaluate(() => rawState()), original);
  await page.evaluate(() => lab.requestRedraw());
  await page.waitForFunction(() => !lab.renderPending());
  assert.deepEqual(await page.locator("canvas").screenshot(), pixels);
  results.push(
    "stale token cannot cancel current session; fragmented publication preserves exact raw/settings/image",
  );
  assert.equal(
    await page.evaluate(async () => {
      const e = lab.core,
        t = e.restore_begin();
      if (!feed(t, 41)) return false;
      e.document_settings(1, 1);
      return (
        e.restore_publish(t) === 0 &&
        e.document_paper() === 1 &&
        e.document_grid() === 1 &&
        e.restore_cancel(t) === 1 &&
        (await drainReplay(t))
      );
    }),
    true,
  );
  results.push("live edit during unpublished replay prevents stale publication");
  const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save07-streaming";
  await mkdir(output, { recursive: true });
  const cleanup = await page.evaluate(() => replayCleanupMetrics);
  await writeFile(
    output + "/results.json",
    JSON.stringify({ candidate: url, results, cleanup }, null, 2),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
} finally {
  await browser.close();
}
