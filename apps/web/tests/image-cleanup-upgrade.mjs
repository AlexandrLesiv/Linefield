import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { imageUpgradeServer } from "./image-upgrade-server.mjs";
import { paddedPng } from "./image-cleanup-fixtures.mjs";
import { hiddenRgbPng } from "./image-import-png.mjs";
const oldRoot = process.env.LINEFIELD_OLD_ROOT,
  newRoot = process.env.LINEFIELD_NEW_ROOT;
if (!oldRoot || !newRoot) throw Error("Frozen old/new roots required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img03/upgrade";
mkdirSync(output, { recursive: true });
const server = await imageUpgradeServer(oldRoot),
  browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext(),
  checks = [];
let page = await context.newPage();
async function editor() {
  for (let i = 0; i < 200; i++) {
    const f = page.frames().find((item) => item.url().includes("/vector-editor/"));
    if (f && (await f.evaluate(() => !!window.lab).catch(() => false))) return f;
    await page.waitForTimeout(100);
  }
  throw Error("Editor startup failed");
}
try {
  await page.goto(server.url);
  await page.locator(".new-tile").click();
  let frame = await editor();
  await frame.locator("#editor-settings-toggle").click();
  const chooser = page.waitForEvent("filechooser");
  await frame.locator("#image-import-open").click();
  await (
    await chooser
  ).setFiles({ name: "legacy.png", mimeType: "image/png", buffer: paddedPng(16 * 1024 * 1024) });
  await frame.waitForFunction(() =>
    document.querySelector("#image-import-notice").textContent.includes("Image added"),
  );
  const retained = await frame.evaluate(async () => {
    await lab.saving.flush(true);
    const c = lab.core;
    const digest = new TextDecoder().decode(
      new Uint8Array(c.memory.buffer, c.image_digest_ptr(0x80000000), 64),
    );
    return {
      digest,
      size: (await lab.saving.readAsset(digest)).blob.size,
      revision: c.delta_durable().toString(),
    };
  });
  let worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  await worker.evaluate(() => {
    globalThis.savedExec = db.exec;
    db.exec = function (options) {
      if (options.sql === storageSql.insertImageAsset) throw Error("storage-quota");
      return savedExec.call(this, options);
    };
  });
  const quota = await frame.evaluate(async (bytes) => {
    try {
      await lab.saving.stageAsset(new Blob([new Uint8Array(bytes)], { type: "image/png" }), {
        version: 1,
        mime: 1,
        width: 64,
        height: 64,
      });
      return false;
    } catch (error) {
      return error.message === "storage-quota" && lab.core.image_count() === 1;
    }
  }, Array.from(hiddenRgbPng()));
  assert.equal(quota, true);
  await worker.evaluate(() => {
    db.exec = savedExec;
  });
  checks.push("injected quota before asset publication preserves saved image");
  const orphan = await frame.evaluate(
    async (bytes) =>
      lab.saving.stageAsset(new Blob([new Uint8Array(bytes)], { type: "image/png" }), {
        version: 1,
        mime: 1,
        width: 64,
        height: 64,
      }),
    Array.from(hiddenRgbPng()),
  );
  console.log("Legacy original saved; staging interruption");
  const url = page.url();
  // Abrupt browser target death abandons the stage lease without a release message.
  const cdp = await page.context().newCDPSession(page);
  await Promise.race([
    cdp.send("Page.crash").catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 1000)),
  ]);
  server.switchRoot(newRoot);
  console.log("Opening upgraded build after crash");
  await page.close().catch(() => {});
  page = await context.newPage();
  await page.goto(url);
  frame = await editor();
  const restored = await frame.evaluate(async (digest) => {
    const asset = await lab.saving.readAsset(digest);
    const actual = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", await asset.blob.arrayBuffer())),
    )
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("");
    return { actual, size: asset.blob.size, count: lab.core.image_count() };
  }, retained.digest);
  assert.equal(restored.actual, retained.digest);
  assert.equal(restored.size, retained.size);
  assert.equal(restored.count, 1);
  checks.push("schema5 16MiB original survives schema6 byte-exact");
  await frame.waitForFunction(
    async (digest) => {
      const status = await lab.saving.maintenanceStatus();
      if (status.assets.count !== 1) return false;
      try {
        await lab.saving.readAsset(digest);
        return false;
      } catch (e) {
        return e.message === "storage-image-missing";
      }
    },
    orphan.digest,
    { timeout: 30000 },
  );
  checks.push("crashed prior-grant stage reclaimed; saved original retained");
  const gc = await frame.evaluate(
    async (bytes) =>
      lab.saving.stageAsset(new Blob([new Uint8Array(bytes)], { type: "image/png" }), {
        version: 1,
        mime: 1,
        width: 64,
        height: 64,
      }),
    Array.from(hiddenRgbPng()),
  );
  worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
  await worker.evaluate(() => {
    globalThis.savedExec = db.exec;
    db.exec = function (options) {
      const result = savedExec.call(this, options);
      if (options.sql === storageSql.deleteAssetCandidate) throw Error("storage-quota");
      return result;
    };
  });
  await frame.evaluate(async ({ lease, digest }) => {
    await lab.saving.finishAsset(lease, null);
    let failed = false;
    for (let i = 0; i < 1000; i++) {
      try {
        await lab.saving.maintainAssets(lab.core.image_cleanup_revision().toString());
      } catch (error) {
        if (error.message !== "storage-quota") throw error;
        failed = true;
        break;
      }
    }
    if (!failed || (await lab.saving.readAsset(digest)).blob.size !== 160)
      throw Error("GC rollback failed");
    await lab.saving.retry();
  }, gc);
  await frame.waitForFunction(
    async () => (await lab.saving.maintenanceStatus()).assets.count === 1,
    null,
    { timeout: 30000 },
  );
  const savedAfter = await frame.evaluate(
    async (digest) => (await lab.saving.readAsset(digest)).blob.size,
    retained.digest,
  );
  assert.equal(savedAfter, retained.size);
  checks.push(
    "injected deletion failure rolls back; worker restart resumes cleanup without losing saved original",
  );
  writeFileSync(output + "/results.json", JSON.stringify({ checks, retained, restored }, null, 2));
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
  await server.close();
}
