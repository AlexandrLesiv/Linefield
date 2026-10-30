import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { inputSession } from "./vector-svg-input-session.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
const baselineOnly = process.env.LINEFIELD_TEXT_BASELINE_ONLY === "1";
if (!origin) throw Error("Isolated preview required");
const out = process.env.LINEFIELD_EVIDENCE_DIR || "../../.build-cache/text01/performance";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const runs = [],
  errors = [];
const stats = (values) => {
  const sorted = values.slice().sort((a, b) => a - b);
  return {
    median: sorted[Math.floor(sorted.length / 2)] || 0,
    p99: sorted[Math.floor((sorted.length - 1) * 0.99)] || 0,
    max: Math.max(0, ...sorted),
  };
};
async function editor(page) {
  for (let i = 0; i < 150; i++) {
    const f = page.frames().find((v) => v.url().includes("/vector-editor/"));
    if (f && (await f.evaluate(() => !!window.lab).catch(() => false))) return f;
    await page.waitForTimeout(100);
  }
  throw Error("Editor startup timeout");
}
const snapshot = () => {
  const c = lab.core;
  return {
    strokes: Array.from({ length: c.count() }, (_, id) =>
      Array.from({ length: c.raw_length(id) }, (_point, i) => [
        String(c.raw_region(id, i, 0)),
        c.raw_local(id, i, 0),
        String(c.raw_region(id, i, 1)),
        c.raw_local(id, i, 1),
        c.raw_point(id, i, 2),
      ]),
    ),
    text: Array.from({ length: c.text_count?.() || 0 }, (_, slot) => {
      const id = 0x40000000 + slot;
      c.text_read(id, 0n, 0, 0n, 0);
      const values = Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20));
      return {
        values,
        text: new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.text_content_ptr(id), values[17]),
        ),
      };
    }),
  };
};
try {
  for (let pair = 0; pair < 3; pair++) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    await page.goto(origin);
    await page.locator(".new-tile").click();
    let f = await editor(page);
    for (const mode of baselineOnly ? ["empty"] : ["empty", "new-label", "warm", "zoomed"]) {
      let publicationMs = 0,
        workStarted = 0,
        preparationLongTasks = [];
      if (mode === "new-label") {
        await f.locator("#text-tool").click();
        await f.locator("canvas").click({ position: { x: 640, y: 390 } });
        await f
          .locator("#text-input")
          .fill(
            Array.from(
              { length: 16 },
              (_, i) => `Line ${i + 1}: Sketch notes — Нотатки і креслення`,
            ).join("\n"),
          );
        await f.evaluate(() => {
          window.preparationTasks = [];
          window.preparationObserver = new PerformanceObserver((list) =>
            preparationTasks.push(...list.getEntries().map((e) => e.duration)),
          );
          preparationObserver.observe({ type: "longtask" });
        });
        workStarted = Date.now();
        await f.locator("#text-done").click();
        await f.locator("#text-editor").waitFor({ state: "hidden", timeout: 60000 });
        publicationMs = Date.now() - workStarted;
        preparationLongTasks = await f.evaluate(() => {
          preparationObserver.disconnect();
          return preparationTasks;
        });
      }
      if (mode === "zoomed") {
        const box = await f.locator("canvas").boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        workStarted = Date.now();
        await page.mouse.wheel(0, -600);
      }
      await f.locator("#pen").click();
      await f.evaluate(() => {
        window.textReadyObserved = 0;
        const observe = () => {
          if (
            (document.querySelector("#text-render-notice")?.hidden ?? true) &&
            !lab.textStatus?.().queued
          )
            window.textReadyObserved = Date.now();
          else requestAnimationFrame(observe);
        };
        requestAnimationFrame(() => requestAnimationFrame(observe));
      });
      const raw = await f.evaluate(inputSession, {
        device: pair === 1 ? "mouse" : "pen",
        count: 240,
        interval: 8,
      });
      assert.equal(raw.raw.length, 241);
      assert(raw.priorRawUnchanged);
      await f.waitForFunction(() => document.querySelector("#text-render-notice")?.hidden ?? true, {
        timeout: 60000,
      });
      await f.waitForFunction(() => window.textReadyObserved > 0);
      const textStatus = await f.evaluate(() => lab.textStatus?.() || { error: "" });
      assert.equal(textStatus.error, "");
      const frames = raw.frames.filter((_, i) => raw.frameAt[i] <= raw.inputEnd);
      const longTasks = raw.longTasks.filter((_, i) => raw.longTaskAt[i] <= raw.inputEnd);
      runs.push({
        pair,
        mode,
        device: raw.device,
        injected: true,
        samples: raw.raw.length,
        publicationMs,
        correctImageObservedMs: workStarted
          ? (await f.evaluate(() => window.textReadyObserved)) - workStarted
          : 0,
        frames: stats(frames),
        dispatch: stats(raw.delays),
        handlers: stats(raw.handlers),
        longTasks,
        preparationLongTasks,
        textStatus,
        heap: stats(raw.heap),
        drawingImageReadyMs: raw.imageReadyMs,
      });
      await writeFile(`${out}/progress.json`, JSON.stringify(runs, null, 2));
    }
    await f.evaluate(() => lab.saving.flush(true));
    const before = await f.evaluate(snapshot);
    await page.reload();
    f = await editor(page);
    await f.waitForFunction((count) => lab.core.count() === count, before.strokes.length);
    if (!baselineOnly) await f.waitForFunction(() => lab.core.text_count() === 1);
    assert.deepEqual(await f.evaluate(snapshot), before);
    await page.screenshot({ path: `${out}/restored-${pair}.png` });
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(
      {
        browser: browser.version(),
        viewport: [1280, 900],
        dpr: 2,
        workload: baselineOnly
          ? "Stroke-only reference; 240 moves at8ms; three trials"
          : "16-line label; 240 moves at8ms; three paired trials",
        runs,
        errors,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(runs));
} finally {
  await browser.close();
}
