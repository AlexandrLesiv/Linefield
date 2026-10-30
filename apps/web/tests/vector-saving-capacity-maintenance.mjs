import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { clients, newClient, call, kill } from "./vector-library-storage-helpers.mjs";
import { seedLayers, documentSnapshot } from "./vector-saving-capacity-document.mjs";
import { drawingDigest, ready } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit frozen maintenance candidate required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save07-maintenance";
const receipts = Number(process.env.LINEFIELD_RECEIPT_COUNT ?? "10001");
if (!Number.isSafeInteger(receipts) || receipts < 128)
  throw Error("At least 128 receipts required");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1000 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on("dialog", (d) => d.accept());
  page.on("console", (message) => {
    if (message.text().startsWith("receipt-progress")) console.log(message.text());
  });
  await page.goto(url);
  await page.locator(".new-tile").click();
  let frame = await ready(page);
  const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  assert(worker);
  await worker.evaluate(() => {
    const commit = database.commitChunks.bind(database);
    database.commitChunks = (...args) => {
      globalThis.firstReceipt ??= structuredClone(args);
      return commit(...args);
    };
  });
  await seedLayers(frame);
  await frame.evaluate(async () => {
    const e = lab.core;
    for (let brush = 0; brush < 3; brush++) {
      e.begin_with_style(12, 0x315a93, 0.1, 1.5, 0.7);
      e.set_active_brush(brush);
      for (let i = 0; i < 81; i++)
        e.push_precise(100 + i * 3, 150 + brush * 80 + Math.sin(i / 9) * 10, 0.2 + (i % 7) / 10);
      e.commit();
    }
    lab.requestRedraw();
    await lab.saving.flush(true);
    for (let i = 0; i < 126; i++) {
      e.document_settings(i % 2, 0);
      await lab.saving.flush(true);
    }
  });
  const initial = await frame.evaluate(() => lab.saving.maintenanceStatus());
  assert.equal(initial.receipts, 127);
  const expected = await drawingDigest(frame);
  const expectedDocument = await documentSnapshot(frame);
  await frame.waitForFunction(() => !lab.renderPending());
  const pixels = await frame.locator("canvas").screenshot();
  await frame.evaluate(async () => {
    lab.core.delete_begin();
    for (let i = 0; i < 3; i++) lab.core.delete_add(i);
    lab.core.delete_commit();
    lab.requestRedraw();
    await lab.saving.flush(true);
  });
  const compacted = await frame.evaluate(async (automatic) => {
    const phases = {},
      start = performance.now();
    for (let i = 0; i < 100000; i++) {
      const state = automatic ? await lab.saving.maintenanceStatus() : await lab.saving.maintain();
      if (automatic && performance.now() - start > 60000)
        throw Error("Automatic checkpoint timed out: " + JSON.stringify({ state, phases }));
      phases[state.phase] = (phases[state.phase] ?? 0) + 1;
      if (
        automatic ? state.checkpoint && state.phase === "idle" && state.tail < 128 : !state.pending
      )
        return {
          phases,
          elapsed: performance.now() - start,
          status: await lab.saving.maintenanceStatus(),
        };
      if (automatic) await new Promise((resolve) => setTimeout(resolve, 16));
    }
    throw Error("Maintenance failed to settle");
  }, process.env.LINEFIELD_AUTOMATIC_MAINTENANCE === "1");
  assert(compacted.status.checkpoint);
  assert.deepEqual(await documentSnapshot(frame), expectedDocument);
  assert.equal(compacted.status.receipts, 128);
  assert(compacted.status.tail < 128);
  const retry = await worker.evaluate(async () => {
    const old = firstReceipt;
    const identical = await database.commitChunks(...old);
    let conflict;
    try {
      await database.commitChunks({ ...old[0], digest: "f".repeat(64) }, ...old.slice(1));
    } catch (error) {
      conflict = error.message;
    }
    return { outcome: identical.outcome, conflict };
  });
  assert.deepEqual(retry, { outcome: "committed", conflict: "storage-conflict" });
  await frame.evaluate(async () => {
    lab.core.undo();
    lab.requestRedraw();
    await lab.saving.flush(true);
  });
  assert.deepEqual(await drawingDigest(frame), expected);
  await frame.waitForFunction(() => !lab.renderPending());
  assert.deepEqual(await frame.locator("canvas").screenshot(), pixels);
  const highCount = await frame.evaluate(async (target) => {
    const started = performance.now();
    let status = await lab.saving.maintenanceStatus();
    for (let i = status.receipts; i < target; i++) {
      if (performance.now() - started > 900000) throw Error("Receipt workload exceeded 15 minutes");
      if (i % 256 === 0) console.log("receipt-progress " + i);
      lab.core.document_settings(i % 2, (i + 1) % 3);
      await lab.saving.flush(true);
      if (i % 128 === 0) while ((await lab.saving.maintain()).pending) {}
    }
    while ((await lab.saving.maintain()).pending) {}
    return lab.saving.maintenanceStatus();
  }, receipts);
  assert.equal(highCount.receipts, receipts);
  assert(highCount.tail < 128);
  const final = await drawingDigest(frame);
  const finalDocument = await documentSnapshot(frame);
  await page.reload();
  frame = await ready(page);
  assert.deepEqual(await drawingDigest(frame), final);
  const reloadedDocument = await documentSnapshot(frame);
  // Existing saving policy restores the first ordered layer as the active UI selection.
  assert.deepEqual(reloadedDocument, { ...finalDocument, active: finalDocument.layers[0].id });
  const reopened = await frame.evaluate(() => lab.saving.maintenanceStatus());
  assert.equal(reopened.receipts, receipts);
  assert.notEqual(reopened.epoch, highCount.epoch);
  const document = new URL(page.url()).pathname.split("/").at(-1);
  await frame.evaluate(() => lab.saving.close());
  await clients(page, url);
  const fresh = await newClient(page),
    grant = crypto.randomUUID();
  await call(page, fresh, "open", { document, grant });
  const freshLoad = await call(page, fresh, "load");
  await call(page, fresh, "close");
  await kill(page, fresh);
  const stale = await newClient(page);
  await assert.rejects(
    call(page, stale, "open", { document, grant: reopened.epoch, reopen: true }),
    /storage-conflict/,
  );
  await kill(page, stale);
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        url,
        browser: browser.version(),
        initial,
        compacted,
        retry,
        highCount,
        reopened,
        exactUndoImage: true,
        exactRawReload: true,
        staleEpochRejected: true,
        exactLayerAndPaperState: true,
        finalDocument,
        activeLayerRestoresFirstOrdered: true,
        freshRevision: freshLoad.revision,
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({ receipts, exactUndoImage: true, exactRawReload: true, compacted, highCount }),
  );
} finally {
  await browser.close();
}
