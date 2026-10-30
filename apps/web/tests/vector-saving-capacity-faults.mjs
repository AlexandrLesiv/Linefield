import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { drawingDigest, ready } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit frozen maintenance candidate required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save07-maintenance-faults";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const fault of [
    "quota-before-publication",
    "kill-before-publication",
    "kill-after-publication",
    "kill-during-gc",
  ]) {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1000 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on("dialog", (d) => d.accept());
    await page.goto(url);
    await page.locator(".new-tile").click();
    let frame = await ready(page);
    const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
    await worker.evaluate((mode) => {
      globalThis.publishAttempts = 0;
      const publish = database.publishCheckpoint.bind(database);
      database.publishCheckpoint = (...args) => {
        globalThis.publishAttempts++;
        if (mode === "quota-before-publication") throw Error("storage-quota");
        return publish(...args);
      };
    }, fault);
    await frame.evaluate(async () => {
      const e = lab.core;
      e.begin_with_style(12, 0x315a93, 0.1, 1.5, 0.7);
      e.set_active_brush(2);
      for (let i = 0; i < 1000; i++)
        e.push_precise(100 + i / 3, 180 + Math.sin(i / 9) * 10, 0.2 + (i % 7) / 10);
      e.commit();
      await lab.saving.flush(true);
      for (let i = 0; i < 127; i++) {
        e.document_settings(i % 2, 0);
        await lab.saving.flush(true);
      }
      lab.requestRedraw();
    });
    const expected = await drawingDigest(frame);
    await frame.waitForFunction(() => !lab.renderPending());
    const pixels = await frame.locator("canvas").screenshot();
    const reached = await frame.evaluate(async (mode) => {
      const phases = [];
      for (let i = 0; i < 10000; i++) {
        try {
          const result = await lab.saving.maintain();
          phases.push(result.phase);
          if (mode === "kill-before-publication" && result.phase === "write")
            return { phases, phase: result.phase };
          if (mode === "kill-during-gc" && result.phase === "cleanup")
            return { phases, phase: result.phase };
          if (mode === "kill-after-publication" && result.phase === "publish")
            return { phases, phase: result.phase };
        } catch (error) {
          if (mode !== "quota-before-publication") throw error;
          return { phases, error: error.message };
        }
      }
      throw Error("Fault boundary was not reached");
    }, fault);
    const attempted = await worker.evaluate(() => publishAttempts);
    if (fault === "quota-before-publication") assert.equal(reached.error, "storage-quota");
    if (fault === "kill-before-publication") assert.equal(attempted, 0);
    if (["kill-after-publication", "kill-during-gc"].includes(fault)) assert.equal(attempted, 1);
    // Abruptly destroy the page/worker without the application's exit-flush path.
    const route = page.url();
    await page.close({ runBeforeUnload: false });
    const reopened = await context.newPage();
    await reopened.goto(route);
    frame = await ready(reopened);
    assert.deepEqual(await drawingDigest(frame), expected);
    await frame.waitForFunction(() => !lab.renderPending());
    assert.deepEqual(await frame.locator("canvas").screenshot(), pixels);
    const status = await frame.evaluate(() => lab.saving.maintenanceStatus());
    assert.equal(status.receipts, 128);
    assert.equal(
      Boolean(status.checkpoint),
      ["kill-after-publication", "kill-during-gc"].includes(fault),
    );
    await frame.evaluate(async () => {
      lab.core.document_settings(2, 2);
      await lab.saving.flush(true);
      for (let i = 0; i < 10000; i++) if (!(await lab.saving.maintain()).pending) return;
      throw Error("Recovered maintenance did not finish");
    });
    const recovered = await frame.evaluate(() => lab.saving.maintenanceStatus());
    assert.equal(recovered.receipts, 129);
    assert(recovered.checkpoint);
    results.push({ fault, reached, attempted, recovered, exactRawAndImage: true });
    await context.close();
  }
  await writeFile(
    output + "/results.json",
    JSON.stringify({ url, browser: browser.version(), results }, null, 2),
  );
  console.log(
    JSON.stringify(
      results.map(({ fault, attempted, recovered, exactRawAndImage }) => ({
        fault,
        attempted,
        recovered,
        exactRawAndImage,
      })),
    ),
  );
} finally {
  await browser.close();
}
