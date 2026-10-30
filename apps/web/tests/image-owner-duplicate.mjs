import { inputSession } from "./vector-svg-input-session.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { ownerEditor, ownerStage, ownerPublish, killOwnerWorker } from "./image-owner-helpers.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img04/duplicate";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  context = await browser.newContext();
async function ready(page) {
  for (let i = 0; i < 150; i++) {
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    if (frame && (await frame.evaluate(() => !!window.lab).catch(() => false))) return frame;
    await page.waitForTimeout(100);
  }
  throw Error("Editor startup failed");
}
async function waitStatus(page, predicate) {
  const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  for (let i = 0; i < 100; i++) {
    const status = await worker.evaluate(() => maintenance.status());
    if (predicate(status)) return status;
    await page.waitForTimeout(100);
  }
  throw Error("Automatic cleanup did not reach expected state");
}
try {
  const first = await context.newPage(),
    frame = await ownerEditor(first, origin);
  const original = await ownerStage(frame);
  await ownerPublish(frame, original);
  await frame.evaluate(() => lab.saving.flush(true));
  const duplicate = await ownerStage(frame);
  assert.equal(duplicate.digest, original.digest);
  await ownerPublish(frame, duplicate);
  const url = first.url();
  await killOwnerWorker(first);
  const next = await context.newPage();
  await next.goto(url);
  let restored = await ready(next);
  assert.equal(await restored.evaluate(() => lab.core.image_count()), 1);
  await restored.evaluate(async () => {
    lab.core.delete_begin();
    lab.core.delete_add(0x80000000);
    lab.core.delete_commit();
    await lab.saving.flush(true);
  });
  await next.reload();
  restored = await ready(next);
  const held = await waitStatus(next, (s) => s.phase === "idle" && s.assets.count === 1);
  // Wait through multiple automatic scans; the retained original root is now a tombstone.
  await next.waitForTimeout(2200);
  const protectedBytes = await restored.evaluate(async (digest) => {
    if (lab.core.image_read(0x80000000, 0n, 0, 0n, 0) !== 0) throw Error("Old root not retired");
    return (await lab.saving.readAsset(digest)).blob.size;
  }, original.digest);
  assert.equal(protectedBytes, original.bytes);
  await first.close();
  const input =
    process.env.LINEFIELD_RECOVERY_INPUT === "1"
      ? await restored.evaluate(inputSession, { device: "pen", count: 240, interval: 8 })
      : undefined;
  if (input) {
    assert.equal(input.raw.length, 241);
    assert(input.priorRawUnchanged);
  }
  // Read-only worker inspection does not wake the host scheduler: this exercises
  // the one-second ownership retry after a different main thread disappears.
  const reclaimed = await waitStatus(next, (s) => s.assets.count === 0);
  const checks = [
    "live unsaved duplicate survives retirement of previous durable root",
    input
      ? "automatic owner recovery preserves drawing samples and reclaims safely"
      : "owner destruction triggers automatic rescan and reclamation without an edit",
  ];
  writeFileSync(out + "/results.json", JSON.stringify({ checks, input, held, reclaimed }, null, 2));
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
