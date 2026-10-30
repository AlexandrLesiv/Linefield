import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  ownerEditor,
  ownerStage,
  killOwnerWorker,
  rawOwnerClient,
  ownerSweep,
} from "./image-owner-helpers.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img04/transaction";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  context = await browser.newContext();
try {
  const first = await context.newPage(),
    frame = await ownerEditor(first, origin),
    asset = await ownerStage(frame);
  const hold = await frame.evaluate(() => lab.saving.holdAssets());
  await frame.evaluate((lease) => lab.saving.finishAsset(lease, null), asset.lease);
  const drawing = new URL(first.url()).pathname.split("/").at(-1);
  await killOwnerWorker(first);
  const next = await context.newPage();
  await rawOwnerClient(next, origin, drawing);
  await ownerSweep(next);
  await frame.evaluate(async (lease) => {
    try {
      await lab.saving.releaseAssets(lease);
    } catch {}
  }, hold);
  const worker = next.workers().find((w) => w.url().includes("/saving/worker.js"));
  await worker.evaluate(() => {
    globalThis.originalExec = db.exec;
    db.exec = function (options) {
      const result = originalExec.call(this, options);
      if (options.sql === storageSql.deleteAbandonedAssetLease) throw Error("storage-quota");
      return result;
    };
  });
  let failed = false;
  try {
    await ownerSweep(next);
  } catch (error) {
    failed = error.message.includes("storage-quota");
  }
  assert(failed, "Injected lease-delete failure must surface");
  const beforeRetry = await worker.evaluate(
    () =>
      db.exec({
        sql: "SELECT count(*) FROM image_asset_leases",
        rowMode: "array",
        returnValue: "resultRows",
      })[0][0],
  );
  assert.equal(beforeRetry, 1);
  assert.equal(
    await next.evaluate(
      async (digest) => (await ownerClient.call("asset-read", { digest })).bytes,
      asset.digest,
    ),
    asset.bytes,
  );
  await worker.evaluate(() => {
    db.exec = originalExec;
  });
  const recovered = await ownerSweep(next);
  assert.equal(recovered.status.assets.count, 0);
  const remaining = await worker.evaluate(
    () =>
      db.exec({
        sql: "SELECT count(*) FROM image_asset_leases",
        rowMode: "array",
        returnValue: "resultRows",
      })[0][0],
  );
  assert.equal(remaining, 0);
  const checks = [
    "failed lease deletion rolls back ownership and preserves original",
    "retry revisits failed lease cursor and safely reclaims original",
  ];
  writeFileSync(out + "/results.json", JSON.stringify({ checks, beforeRetry, recovered }, null, 2));
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
