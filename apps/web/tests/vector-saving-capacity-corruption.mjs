import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { drawingDigest, ready } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit frozen candidate required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save07-garbage-corruption";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  await page.locator(".new-tile").click();
  let frame = await ready(page);
  await frame.evaluate(async () => {
    lab.core.begin_with_style(12, 0x315a93, 0.1, 1.5, 0.7);
    for (let i = 0; i < 100; i++)
      lab.core.push_precise(100 + i * 3, 150 + Math.sin(i / 7) * 15, 0.5);
    lab.core.commit();
    lab.requestRedraw();
    await lab.saving.flush(true);
  });
  const expected = await drawingDigest(frame);
  const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  const evidence = await worker.evaluate(async () => {
    const sql = (query) => db.exec({ sql: query, rowMode: "array", returnValue: "resultRows" });
    const snapshot = () =>
      JSON.stringify(
        sql(
          "SELECT storage,stream,chunk,last,hex(data) FROM save_chunks ORDER BY storage,stream,chunk",
        ),
      );
    const before = snapshot();
    sql(
      "INSERT INTO save_garbage SELECT storage FROM save_batches WHERE storage IS NOT NULL LIMIT 1",
    );
    let cleanupError, reopenError;
    try {
      database.cleanup();
    } catch (error) {
      cleanupError = error.message;
    }
    const afterCleanup = snapshot();
    const id = database.identity;
    try {
      await drawingDatabase(db, false, id.grant, id.document, id.incarnation, true);
    } catch (error) {
      reopenError = error.message;
    }
    const afterOpen = snapshot();
    // Remove only the deliberately injected corruption; production must never do this automatically.
    sql("DELETE FROM save_garbage WHERE storage IN (SELECT storage FROM save_batches)");
    return {
      cleanupError,
      reopenError,
      cleanupPreservedAllBytes: before === afterCleanup,
      reopenPreservedAllBytes: before === afterOpen,
    };
  });
  assert.deepEqual(evidence, {
    cleanupError: "storage-corrupt",
    reopenError: "storage-corrupt",
    cleanupPreservedAllBytes: true,
    reopenPreservedAllBytes: true,
  });
  await page.reload();
  frame = await ready(page);
  assert.deepEqual(await drawingDigest(frame), expected);
  await writeFile(
    output + "/results.json",
    JSON.stringify({ url, evidence, exactRawReloadAfterFixtureRepair: true }, null, 2),
  );
  console.log(JSON.stringify(evidence));
} finally {
  await browser.close();
}
