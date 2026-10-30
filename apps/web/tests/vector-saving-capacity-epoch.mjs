import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { ready } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit frozen candidate required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save07-epoch-prune";
await mkdir(output, { recursive: true });
async function drain(frame) {
  return frame.evaluate(async () => {
    for (let i = 0; i < 20000; i++)
      if (!(await lab.saving.maintain()).pending) return lab.saving.maintenanceStatus();
    throw Error("Checkpoint did not settle");
  });
}
async function checkpoint(page) {
  const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  return worker.evaluate(() => {
    const plan = database.maintenancePlan();
    const batch = plan.batches.find((b) => b.operation === plan.checkpoint);
    const part = database.read(plan.checkpoint, 0, 0),
      v = new DataView(part.bytes.buffer, part.bytes.byteOffset);
    const count = v.getUint32(28, true);
    return {
      operation: plan.checkpoint,
      bytes: batch.bytes,
      magic: new TextDecoder().decode(part.bytes.slice(0, 4)),
      sources: Array.from({ length: count }, (_, i) => ({
        id: v.getUint32(32 + i * 8, true),
        samples: v.getUint32(36 + i * 8, true),
      })),
    };
  });
}
async function raw(frame, strokeId) {
  return frame.evaluate((id) => {
    const e = lab.core;
    return Array.from({ length: e.raw_length(id) }, (_, i) => [
      String(e.raw_region(id, i, 0)),
      e.raw_local(id, i, 0),
      String(e.raw_region(id, i, 1)),
      e.raw_local(id, i, 1),
      e.raw_point(id, i, 2),
    ]);
  }, strokeId);
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  await page.locator(".new-tile").click();
  let frame = await ready(page);
  await frame.evaluate(async () => {
    lab.core.begin_with_style(12, 0x315a93, 0.1, 1.5, 0.7);
    for (let i = 0; i < 2048; i++)
      lab.core.push_precise(100 + i / 8, 200 + Math.sin(i / 9) * 10, 0.5);
    lab.core.commit();
    await lab.saving.flush(true);
    for (let i = 0; i < 126; i++) {
      lab.core.document_settings(i % 2, 0);
      await lab.saving.flush(true);
    }
    lab.core.delete_begin();
    lab.core.delete_add(0);
    lab.core.delete_commit();
    await lab.saving.flush(true);
  });
  const firstStatus = await drain(frame),
    first = await checkpoint(page);
  assert.equal(first.magic, "LFC4");
  assert.deepEqual(first.sources, [{ id: 0, samples: 2048 }]);
  await page.reload();
  frame = await ready(page);
  const baseline = await frame.evaluate(() => lab.saving.maintenanceStatus());
  assert.notEqual(baseline.epoch, firstStatus.epoch);
  assert.equal(baseline.baseline, "128");
  const addedId = await frame.evaluate(async () => {
    const id = lab.core.count();
    lab.core.begin_with_style(7, 0x745322, 0.1, 1.5, 0.8);
    for (let i = 0; i < 64; i++)
      lab.core.push_precise(100 + i * 3, 220 + Math.sin(i / 7) * 10, 0.3 + i / 100);
    lab.core.commit();
    await lab.saving.flush(true);
    for (let i = 0; i < 127; i++) {
      lab.core.document_settings(i % 2, 0);
      await lab.saving.flush(true);
    }
    lab.requestRedraw();
    return id;
  });
  const expected = await raw(frame, addedId);
  assert.equal(expected.length, 64);
  const secondStatus = await drain(frame),
    second = await checkpoint(page);
  assert.deepEqual(second.sources, [{ id: 1, samples: 64 }]);
  assert(second.bytes < first.bytes);
  await frame.waitForFunction(() => !lab.renderPending());
  const pixels = await frame.locator("canvas").screenshot();
  await page.reload();
  frame = await ready(page);
  assert.deepEqual(await raw(frame, addedId), expected);
  await frame.waitForFunction(() => !lab.renderPending());
  assert.deepEqual(await frame.locator("canvas").screenshot(), pixels);
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { url, firstStatus, first, baseline, secondStatus, second, exactNewRawAndImage: true },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ first, second, exactNewRawAndImage: true }));
} finally {
  await browser.close();
}
