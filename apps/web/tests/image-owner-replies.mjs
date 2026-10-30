import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { ownerEditor, ownerStage, ownerPublish } from "./image-owner-helpers.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img04/replies";
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  checks = [];
async function intercept(page, kind) {
  const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  await worker.evaluate((mode) => {
    const send = globalThis.postMessage.bind(globalThis);
    let done = false;
    globalThis.postMessage = (message) => {
      const value = message.value;
      const match =
        mode === "stage"
          ? value?.lease
          : mode === "hold"
            ? typeof value === "string"
            : ["finish", "release"].includes(mode)
              ? !message.error && value === undefined
              : value?.outcome === "committed";
      if (done || !match) {
        send(message);
        return;
      }
      done = true;
      if (mode === "receipt") {
        send({ ...message, value: { ...value, result: "999999" } });
        return;
      }
      setTimeout(() => {
        throw Error("Injected lost reply and worker failure");
      }, 0);
    };
  }, kind);
}
async function reclaim(frame) {
  return frame.evaluate(async () => {
    for (let i = 0; i < 1000; i++) {
      const result = await lab.saving.maintainAssets(lab.core.image_cleanup_revision().toString());
      if (!result.pending) return lab.saving.maintenanceStatus();
    }
    throw Error("Cleanup did not settle");
  });
}
try {
  for (const mode of ["stage", "hold", "release", "finish", "receipt"]) {
    const page = await browser.newPage(),
      frame = await ownerEditor(page, origin);
    const asset = mode === "finish" || mode === "receipt" ? await ownerStage(frame) : undefined;
    const hold =
      mode === "release" ? await frame.evaluate(() => lab.saving.holdAssets()) : undefined;
    if (mode === "receipt") await ownerPublish(frame, asset);
    await intercept(page, mode);
    let failed = false;
    try {
      if (mode === "stage") await ownerStage(frame);
      else if (mode === "hold") await frame.evaluate(() => lab.saving.holdAssets());
      else if (mode === "release")
        await frame.evaluate((lease) => lab.saving.releaseAssets(lease), hold);
      else if (mode === "finish") await ownerPublish(frame, asset);
      else await frame.evaluate(() => lab.saving.flush(true));
    } catch {
      failed = true;
    }
    assert(failed, "Injected response must fail " + mode);
    const held = await frame.evaluate(
      async () =>
        (await navigator.locks.query()).held.filter((lock) =>
          lock.name.startsWith("linefield-asset-owner-v1:"),
        ).length,
    );
    assert.equal(held, mode === "finish" || mode === "receipt" ? 1 : 0);
    await frame.evaluate(() => lab.saving.retry());
    const state = await reclaim(frame);
    assert.equal(state.owners.live, 0);
    const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
    const leases = await worker.evaluate(
      () =>
        db.exec({
          sql: "SELECT count(*) FROM image_asset_leases",
          rowMode: "array",
          returnValue: "resultRows",
        })[0][0],
    );
    assert.equal(leases, 0, "Recovery must reclaim ended lease rows, including empty export holds");
    assert.equal(state.assets.count, asset ? 1 : 0);
    if (asset) assert.equal(await frame.evaluate(() => lab.core.image_count()), 1);
    checks.push(
      mode === "stage"
        ? "lost stage reply releases known unpublished owner and reclaims committed orphan"
        : mode === "hold"
          ? "lost hold reply releases owner and reclaims otherwise stranded export lease"
          : mode === "release"
            ? "lost export release reply releases ended ownership"
            : mode === "finish"
              ? "lost publication finish keeps lock until retry and validated durability"
              : "forged receipt does not release owner; exact retry receipt does",
    );
    await page.close();
  }
  writeFileSync(out + "/results.json", JSON.stringify({ checks }, null, 2));
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
