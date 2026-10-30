import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { drawingDigest, ready } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit frozen candidate required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save07-maintenance-autosave";
await mkdir(output, { recursive: true });
async function observe(worker, accept, timeout = 60000) {
  const started = Date.now();
  for (;;) {
    // Read the worker directly: diagnostics must not wake or repair the host scheduler.
    const state = await worker.evaluate(() => maintenance.status());
    if (accept(state)) return state;
    if (Date.now() - started > timeout)
      throw Error("Maintenance stalled: " + JSON.stringify(state));
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  await page.locator(".new-tile").click();
  let frame = await ready(page);
  await frame.evaluate(async () => {
    lab.core.begin_with_style(12, 0x315a93, 0.1, 1.5, 0.7);
    for (let i = 0; i < 80; i++) lab.core.push_precise(100 + i * 3, 150, 0.5);
    lab.core.commit();
    await lab.saving.flush(true);
    for (let i = 0; i < 127; i++) {
      lab.core.document_settings(i % 2, 0);
      await lab.saving.flush(true);
    }
    lab.requestRedraw();
  });
  const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  assert(worker);
  const start = await observe(
    worker,
    (state) => state.phase !== "idle" && state.phase !== "failed",
    15000,
  );
  await frame.evaluate(() => lab.saving.flush()); // Already durable; must not cancel maintenance.
  const afterNoop = await observe(worker, (state) => state.phase !== start.phase, 15000);
  const box = await frame.locator("canvas").boundingBox();
  assert(box);
  await page.mouse.move(box.x + 150, box.y + 280);
  await page.mouse.down();
  for (let i = 1; i <= 30; i++)
    await page.mouse.move(box.x + 150 + i * 5, box.y + 280 + Math.sin(i / 3) * 20);
  await page.mouse.up();
  const beforeSave = await frame.evaluate(() => ({
    count: lab.core.count(),
    revision: String(lab.core.delta_revision()),
  }));
  assert.equal(beforeSave.count, 2);
  // Deliberately no flush: a real stroke must schedule autosave despite maintenance timers.
  await frame.waitForFunction(
    (revision) => lab.saving.state().durable >= BigInt(revision),
    beforeSave.revision,
    { timeout: 15000 },
  );
  const expected = await drawingDigest(frame);
  const settled = await observe(
    worker,
    (state) => state.checkpoint && state.phase === "idle" && state.tail < 128,
  );
  assert.equal(settled.receipts, 129);
  await page.reload();
  frame = await ready(page);
  assert.deepEqual(await drawingDigest(frame), expected);
  await writeFile(
    output + "/results.json",
    JSON.stringify({ url, start, afterNoop, beforeSave, settled, exactRawReload: true }, null, 2),
  );
  console.log(JSON.stringify({ start, settled, exactRawReload: true }));
} finally {
  await browser.close();
}
