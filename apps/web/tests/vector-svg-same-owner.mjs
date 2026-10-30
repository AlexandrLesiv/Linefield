import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inputSession } from "./vector-svg-input-session.mjs";
import { seedSvgDocument, exportSameDocument, visibleBase } from "./vector-svg-app-setup.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL,
  script = process.env.LINEFIELD_SVG_SCRIPT;
if (!url || !script) throw Error("Isolated same-owner checkpoint and fixture script required");
const q = (v, p) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) * p)] ?? 0;
const stats = (v) => ({
  median: q(v, 0.5),
  p95: q(v, 0.95),
  p99: q(v, 0.99),
  max: Math.max(0, ...v),
});
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  assert.ok(frame);
  await frame.waitForFunction(() => !!window.lab && !lab.renderPending());
  await frame.addScriptTag({ type: "module", url: script });
  await frame.waitForFunction(() => !!window.svgProbe);
  assert.equal(await frame.evaluate(() => typeof lab.core.svg_begin), "function");
  const setup = await frame.evaluate(seedSvgDocument);
  assert.equal(setup.samples, 10000);
  const warmup = await frame.evaluate(inputSession, { device: "pen", count: 30 });
  assert.equal(warmup.raw.length, 31);
  delete warmup.raw;
  await frame.waitForFunction(() => !lab.renderPending());
  const base = await frame.evaluate(visibleBase);
  const environment = await frame.evaluate(() => ({
    ua: navigator.userAgent,
    dpr: devicePixelRatio,
    width: innerWidth,
    height: innerHeight,
  }));
  const runs = [];
  for (let pair = 0; pair < 5; pair++) {
    const paired = [];
    for (const exporting of pair % 2 ? [true, false] : [false, true]) {
      assert.equal(
        await frame.evaluate(visibleBase),
        base,
        "same visible completed input for every pair",
      );
      let exportingPromise;
      if (exporting) {
        await frame.evaluate(() => (window.svgSealed = false));
        exportingPromise = frame.evaluate(exportSameDocument);
        await frame.waitForFunction(() => window.svgSealed);
      }
      const inputPromise = frame.evaluate(inputSession, {
        device: pair % 2 ? "mouse" : "pen",
        visibleOnly: true,
      });
      const [result, exportResult] = await Promise.all([
        inputPromise,
        exportingPromise ?? Promise.resolve(null),
      ]);
      assert.equal(result.raw.length, result.expectedSamples);
      assert.equal(result.priorRawUnchanged, true);
      assert.equal(result.saving.phase, "saved");
      if (exportResult) assert.equal(exportResult.revision, exportResult.snapshotRevision);
      const digest = createHash("sha256").update(JSON.stringify(result.raw)).digest("hex");
      delete result.raw;
      const overlap = (values, times, start) =>
        values.filter((_, i) => times[i] >= start && times[i] <= exportResult.absoluteEnd);
      const summary = {
        pair,
        exporting,
        device: result.device,
        digest,
        frames: stats(result.frames),
        dispatch: stats(result.delays),
        handlers: stats(result.handlers),
        longTasks: result.longTasks,
        peakManagedHeap: Math.max(0, ...result.heap),
        imageReadyMs: result.imageReadyMs,
        export: exportResult,
        overlap: exportResult
          ? {
              frames: stats(overlap(result.frames, result.frameAt, exportResult.absoluteStart)),
              dispatch: stats(
                overlap(result.delays, result.dispatchAt, exportResult.absoluteStart),
              ),
              workerDispatch: stats(
                overlap(result.delays, result.dispatchAt, exportResult.absoluteJob),
              ),
              samples: overlap(result.delays, result.dispatchAt, exportResult.absoluteStart).length,
            }
          : null,
      };
      paired.push(summary);
      runs.push({ summary, raw: result });
      console.log(JSON.stringify(summary));
      await frame.locator("canvas").focus();
      await page.keyboard.press("Control+z");
      await frame.waitForFunction(() => !lab.renderPending());
      await frame.evaluate(() => lab.saving.flush(true));
    }
    assert.equal(paired[0].digest, paired[1].digest, "all accepted paired samples identical");
  }
  assert.deepEqual(errors, []);
  writeFileSync(
    process.env.LINEFIELD_SVG_REPORT ?? ".build-cache/svg01/same-owner-warm-results.json",
    JSON.stringify(
      {
        setup,
        warmup,
        environment,
        runs,
        kind: "actual editor main-thread completed snapshot and worker export while drawing",
        physicalPen: false,
        limitations: [
          "Feature-gated checkpoint only; no production export UI",
          "No GPU job pausing on input implemented",
          "New drawing starts after coherent metadata seal",
          "Managed heap excludes browser/GPU allocations",
          "Each measured stroke is undone through UI before the next run; visible source data identical",
          "Normal next-stroke commit abandons prior Redo, so invariance checks cover prior visible data",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
