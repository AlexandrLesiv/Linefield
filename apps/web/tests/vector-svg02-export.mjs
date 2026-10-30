import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { seedSvgDocument } from "./vector-svg-app-setup.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated SVG02 actual-app URL required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  assert.ok(frame);
  await frame.waitForFunction(
    () => !!window.lab?.core && !!document.querySelector("#svg-export-open"),
  );
  await frame.evaluate(seedSvgDocument);
  const state = () =>
    frame.evaluate(() => {
      const c = lab.core;
      return {
        count: c.count(),
        undo: c.can_undo(),
        redo: c.can_redo(),
        samples: Array.from({ length: c.count() }, (_, id) => c.raw_length(id)),
        raw: Array.from({ length: c.count() }, (_, id) =>
          Array.from({ length: c.raw_length(id) }, (_sample, i) =>
            [0, 1, 2].map((k) => c.raw_point(id, i, k)),
          ),
        ),
      };
    });
  const before = await state();
  const open = async () => {
    await frame.locator("#editor-settings-toggle").click();
    await frame.locator("#svg-export-open").click();
  };
  const start = async () => {
    await open();
    await frame.locator("#svg-export-start").click();
  };
  const result = async () => {
    await frame.locator("#svg-export-download:not([hidden])").waitFor({ timeout: 60000 });
    const bytes = await frame.evaluate(async () => {
      const href = document.querySelector("#svg-export-download").href;
      return Array.from(new Uint8Array(await (await fetch(href)).arrayBuffer()));
    });
    return {
      bytes: bytes.length,
      sha: createHash("sha256").update(new Uint8Array(bytes)).digest("hex"),
    };
  };
  await start();
  const baseline = await result();
  assert.deepEqual(await state(), before);
  results.push({ name: "complete export", ...baseline });
  await start();
  await frame.locator("#svg-export-notice button").filter({ hasText: "Cancel" }).click();
  await frame.waitForFunction(() => !document.querySelector("#svg-export-open").disabled);
  assert.equal(await frame.locator("#svg-export-download").isVisible(), false);
  assert.deepEqual(await state(), before);
  results.push({ name: "cancel without output or data changes" });
  await start();
  assert.deepEqual(await result(), baseline);
  results.push({ name: "retry after cancellation is byte exact" });
  for (const phase of [
    "draw",
    "before-encode",
    "after-encode",
    "worker-error",
    "between-requests-error",
  ]) {
    if (phase === "between-requests-error")
      await frame.evaluate(() => {
        window.svgOriginalTimeout = window.setTimeout;
        window.setTimeout = (handler, delay, ...args) =>
          window.svgOriginalTimeout(handler, delay === 0 ? 200 : delay, ...args);
      });
    await open();
    const nextWorker = page.waitForEvent("worker");
    let release;
    const held = new Promise((resolve) => {
      release = resolve;
    });
    await page.route("**/core.wasm", async (route) => {
      await held;
      await route.continue();
    });
    await frame.locator("#svg-export-start").click();
    const worker = await nextWorker;
    assert.equal(await worker.evaluate(() => self.name), "linefield-svg-export");
    await worker.evaluate((phaseInput) => {
      if (phaseInput === "worker-error") {
        setTimeout(() => {
          throw Error("injected-svg-worker-error");
        }, 0);
        return;
      }
      if (phaseInput === "between-requests-error") {
        const send = self.postMessage.bind(self);
        let scheduled = false;
        self.postMessage = (...args) => {
          send(...args);
          if (!scheduled && args[0].id && !args[0].error) {
            scheduled = true;
            setTimeout(() => {
              throw Error("injected-svg-between-requests-error");
            }, 50);
          }
        };
        return;
      }
      const original = WebGL2RenderingContext.prototype.drawArraysInstanced;
      const originalEncode = OffscreenCanvas.prototype.convertToBlob;
      let context;
      let lost = false;
      WebGL2RenderingContext.prototype.drawArraysInstanced = function (...args) {
        context = this;
        if (!lost && phaseInput === "draw") {
          lost = true;
          this.getExtension("WEBGL_lose_context").loseContext();
        }
        return original.apply(this, args);
      };
      OffscreenCanvas.prototype.convertToBlob = async function (...args) {
        if (context && phaseInput === "before-encode")
          context.getExtension("WEBGL_lose_context").loseContext();
        const blob = await originalEncode.apply(this, args);
        if (context && phaseInput === "after-encode")
          context.getExtension("WEBGL_lose_context").loseContext();
        return blob;
      };
    }, phase);
    release();
    await frame.waitForFunction(() => !document.querySelector("#svg-export-open").disabled, null, {
      timeout: 60000,
    });
    await page.unroute("**/core.wasm");
    assert.equal(await frame.locator("#svg-export-download").isVisible(), false);
    assert.deepEqual(await state(), before);
    results.push({ name: `${phase} rejects without output or data changes` });
    if (phase === "between-requests-error")
      await frame.evaluate(() => {
        window.setTimeout = window.svgOriginalTimeout;
        delete window.svgOriginalTimeout;
      });
    await start();
    assert.deepEqual(await result(), baseline);
    await frame.evaluate(() => lab.saving.flush(true));
    assert.deepEqual(await state(), before);
    results.push({ name: `${phase} retry is byte exact; saving settles` });
  }
  writeFileSync(
    process.env.LINEFIELD_REPORT ?? ".build-cache/svg02/export-recovery.json",
    JSON.stringify({ results, viewport: [1280, 900], dpr: 2, synthetic: true }, null, 2),
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
