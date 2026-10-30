import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { inputSession } from "./vector-svg-input-session.mjs";
import { paddedPng } from "./image-cleanup-fixtures.mjs";
import { hiddenRgbPng } from "./image-import-png.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img03/storage";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage(),
  evidence = [];
try {
  await page.goto(origin);
  await page.locator(".new-tile").click();
  const frame = await (async () => {
    for (let n = 0; n < 100; n++) {
      const f = page.frames().find((item) => item.url().includes("/vector-editor/"));
      if (f && (await f.evaluate(() => !!window.lab).catch(() => false))) return f;
      await page.waitForTimeout(100);
    }
    throw Error("Editor startup");
  })();
  await frame.evaluate(`window.cleanupInput = ${inputSession.toString()}`);
  const outcome = await frame.evaluate(
    async (encoded) => {
      const save = lab.saving,
        c = lab.core,
        results = [];
      const blob = await (await fetch("data:image/png;base64," + encoded)).blob();
      const metadata = { version: 1, mime: 1, width: 64, height: 64 };
      const stage = () => save.stageAsset(blob, metadata);
      const sweep = async () => {
        await save.flush(true);
        for (let i = 0; i < 3000; i++) {
          const revision = c.image_cleanup_revision();
          if (revision < 0n) {
            await new Promise((r) => setTimeout(r, 10));
            continue;
          }
          const result = await save.maintainAssets(revision.toString());
          if (!result.pending) return save.maintenanceStatus();
        }
        throw Error("Cleanup did not settle");
      };
      const a = await stage(),
        b = await stage();
      if (a.digest !== b.digest || a.lease === b.lease) throw Error("Dedup lease identity");
      await save.finishAsset(a.lease, null);
      await sweep();
      if ((await save.readAsset(b.digest)).blob.size !== blob.size)
        throw Error("Live dedup lease lost");
      results.push("dedup cancellation retains other lease");
      const hold = await save.holdAssets();
      await save.finishAsset(b.lease, null);
      await sweep();
      await save.readAsset(b.digest);
      results.push("export hold retains cancelled original");
      const drawing = window.cleanupInput({ device: "pen", count: 240, interval: 8 });
      await save.releaseAssets(hold);
      const reclaimed = await sweep();
      const input = await drawing;
      if (input.raw.length !== 241 || !input.priorRawUnchanged)
        throw Error("Cleanup drawing samples changed");
      let missing = false;
      try {
        await save.readAsset(b.digest);
      } catch (error) {
        missing = error.message === "storage-image-missing";
      }
      if (!missing) throw Error("Cancelled original not reclaimed");
      results.push("last lease release reclaims original");
      const retry = await stage();
      await save.finishAsset(retry.lease, null);
      await sweep();
      results.push("same digest restages after reclamation");
      for (let i = 0; i < 130; i++) {
        c.document_settings(i % 2, 0);
        await save.flush(true);
      }
      const ordinary = await save.maintain();
      if (!ordinary.pending) throw Error("Ordinary checkpoint did not start");
      const during = await stage();
      await save.finishAsset(during.lease, null);
      await sweep();
      let removed = false;
      try {
        await save.readAsset(during.digest);
      } catch (error) {
        removed = error.message === "storage-image-missing";
      }
      if (!removed) throw Error("Ordinary checkpoint handoff skipped asset proof");
      results.push("ordinary checkpoint hands off to asset proof");
      return { results, input, reclaimed, final: await save.maintenanceStatus() };
    },
    (process.env.LINEFIELD_ASSET_BYTES
      ? paddedPng(Number(process.env.LINEFIELD_ASSET_BYTES))
      : hiddenRgbPng()
    ).toString("base64"),
  );
  assert.equal(outcome.results.length, 5);
  evidence.push(outcome);
  writeFileSync(output + "/results.json", JSON.stringify({ origin, results: evidence }, null, 2));
  console.log(JSON.stringify({ passed: outcome.results }));
} finally {
  await browser.close();
}
