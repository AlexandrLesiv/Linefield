import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  ownerEditor,
  ownerStage,
  ownerPublish,
  killOwnerWorker,
  rawOwnerClient,
  ownerSweep,
} from "./image-owner-helpers.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img04/races";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  context = await browser.newContext(),
  checks = [];
try {
  const first = await context.newPage(),
    frame = await ownerEditor(first, origin),
    asset = await ownerStage(frame);
  const hold = await frame.evaluate(() => lab.saving.holdAssets());
  const revision = await ownerPublish(frame, asset);
  const prior = await frame.evaluate(() => lab.saving.maintenanceStatus());
  assert.equal(prior.owners.live, 2);
  assert.equal(revision, "1");
  const drawing = new URL(first.url()).pathname.split("/").at(-1);
  await killOwnerWorker(first);
  const second = await context.newPage();
  await rawOwnerClient(second, origin, drawing);
  const protectedState = await ownerSweep(second);
  assert.equal(protectedState.status.assets.count, 1);
  assert.equal(protectedState.result.phase, "asset-owner-wait");
  checks.push("live unsaved publication and export survive worker loss and writer takeover");
  await frame.evaluate(async (lease) => {
    try {
      await lab.saving.releaseAssets(lease);
    } catch {}
  }, hold);
  await ownerSweep(second);
  assert.equal(
    await second.evaluate(async () => (await ownerClient.call("maintenance-status")).assets.count),
    1,
  );
  checks.push("ending export does not remove live unsaved publication");
  await first.close();
  const retired = await ownerSweep(second);
  assert.equal(retired.status.assets.count, 0);
  checks.push("main destruction releases capability; later proof reclaims abandoned original");
  const worker = second.workers().find((w) => w.url().includes("/saving/worker.js"));
  await worker.evaluate(() => {
    // A legacy lease has no positive owner proof and must remain conservative.
    db.exec({
      sql: "INSERT INTO image_asset_leases(token,grant,digest,kind,revision,owner) VALUES(?,?,?,?,?,?)",
      bind: [crypto.randomUUID(), "legacy-owner", "*", "export", "", ""],
    });
  });
  await ownerSweep(second);
  const legacy = await worker.evaluate(
    () =>
      db.exec({
        sql: "SELECT count(*) FROM image_asset_leases WHERE owner='' AND kind='export'",
        rowMode: "array",
        returnValue: "resultRows",
      })[0][0],
  );
  assert.equal(legacy, 1);
  checks.push("unknown legacy export ownership is never guessed dead");
  writeFileSync(
    out + "/results.json",
    JSON.stringify({ checks, protectedState, retired }, null, 2),
  );
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
