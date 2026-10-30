import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { inputSession } from "./vector-svg-input-session.mjs";
const fixture = process.env.LINEFIELD_SVG_URL,
  app = process.env.LINEFIELD_PREVIEW_URL;
if (!fixture || !app) throw Error("Isolated export and app origins required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? 0;
const stats = (values) => ({
  median: percentile(values, 0.5),
  p95: percentile(values, 0.95),
  p99: percentile(values, 0.99),
  max: Math.max(0, ...values),
});
try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(fixture);
  await page.waitForFunction(() => !!window.svgProbe);
  const setup = await page.evaluate(async () => {
    const start = performance.now(),
      bytes = await (await fetch("/core.wasm")).arrayBuffer();
    const core = (await WebAssembly.instantiate(bytes, {})).instance.exports;
    const wasmReadyMs = performance.now() - start,
      seedAt = performance.now();
    for (let stroke = 0; stroke < 20; stroke++) {
      core.begin_fixed_width(6, 0x304050, 0.6);
      core.set_active_brush(stroke % 3);
      for (let i = 0; i < 500; i++)
        core.push_precise(
          24 + (i % 100) * 4.6,
          24 + stroke * 14 + (i % 2) * 5 + Math.floor(i / 100) * 0.5,
          0.7,
        );
      core.commit();
    }
    window.exportCore = core;
    return {
      wasmReadyMs,
      seedMs: performance.now() - seedAt,
      wasmBytes: bytes.byteLength,
      wasmMemory: core.memory.buffer.byteLength,
    };
  });
  await page.evaluate((origin) => {
    const iframe = document.createElement("iframe");
    iframe.src = origin;
    Object.assign(iframe.style, {
      position: "fixed",
      inset: "0",
      width: "100%",
      height: "100%",
      border: "0",
    });
    iframe.id = "actual-app";
    document.body.append(iframe);
  }, app);
  await page.locator("#actual-app").waitFor();
  let host;
  for (let n = 0; n < 100; n++) {
    host = page.frames().find((frame) => frame.url().startsWith(app));
    if (host) break;
    await page.waitForTimeout(50);
  }
  if (!host) throw Error("Actual app frame missing");
  await host.locator(".new-tile").click();
  await page.waitForFunction(() => document.querySelector("#actual-app")?.contentWindow !== null);
  let editor;
  for (let n = 0; n < 100; n++) {
    editor = page.frames().find((frame) => frame.url().includes("/vector-editor/"));
    if (editor) break;
    await page.waitForTimeout(50);
  }
  if (!editor) throw Error("Actual editor frame missing");
  await editor.waitForFunction(() => !!window.lab && !lab.renderPending());
  const environment = await editor.evaluate(() => ({
    ua: navigator.userAgent,
    dpr: devicePixelRatio,
    width: innerWidth,
    height: innerHeight,
  }));
  const runs = [];
  for (let pair = 0; pair < 5; pair++) {
    const pairRuns = [];
    for (const exporting of pair % 2 ? [true, false] : [false, true]) {
      const input = editor.evaluate(inputSession, { device: pair % 2 ? "mouse" : "pen" });
      await page.waitForTimeout(100);
      const exportResult = exporting
        ? await page.evaluate(async () => {
            const start = performance.now(),
              snapshot = await svgProbe.capture(exportCore, 0.05),
              captured = performance.now();
            const result = await svgProbe.job(
              snapshot.groups,
              { x: 0, y: 0, width: 512, height: 384, density: 2 },
              "whole",
              1024,
              4,
            );
            const ended = performance.now();
            return {
              absoluteStart: performance.timeOrigin + start,
              absoluteJob: performance.timeOrigin + captured,
              absoluteEnd: performance.timeOrigin + ended,
              captureMs: captured - start,
              jobRoundtripMs: ended - captured,
              totalMs: ended - start,
              workerMs: result.milliseconds,
              pngBytes: result.encoded,
              svgBytes: new TextEncoder().encode(result.svg).length,
              rasterPixels: result.pixels,
              packets: snapshot.packets,
              derivedBytes: snapshot.derivedBytes,
              retainedLogicalBytes: snapshot.retainedBytes,
              capsules: snapshot.groups.reduce((n, g) => n + g.bytes.byteLength / 32, 0),
              wasmMemory: exportCore.memory.buffer.byteLength,
            };
          })
        : null;
      const result = await input;
      assert.equal(result.raw.length, result.expectedSamples);
      assert.equal(result.priorRawUnchanged, true);
      assert.equal(result.saving.phase, "saved");
      const digest = createHash("sha256").update(JSON.stringify(result.raw)).digest("hex");
      delete result.raw;
      const overlap = (values, at, start) =>
        values.filter((_, i) => at[i] >= start && at[i] <= exportResult.absoluteEnd);
      const duringExport = exportResult
        ? {
            frame: stats(overlap(result.frames, result.frameAt, exportResult.absoluteStart)),
            dispatch: stats(overlap(result.delays, result.dispatchAt, exportResult.absoluteStart)),
            workerFrame: stats(overlap(result.frames, result.frameAt, exportResult.absoluteJob)),
            workerDispatch: stats(
              overlap(result.delays, result.dispatchAt, exportResult.absoluteJob),
            ),
            samples: overlap(result.delays, result.dispatchAt, exportResult.absoluteStart).length,
          }
        : null;
      const summary = {
        duringExport,
        pair,
        exporting,
        device: result.device,
        digest,
        frames: stats(result.frames),
        dispatchDelay: stats(result.delays),
        handler: stats(result.handlers),
        longTasks: result.longTasks,
        peakManagedHeap: Math.max(0, ...result.heap),
        imageReadyMs: result.imageReadyMs,
        export: exportResult,
      };
      runs.push({ summary, raw: result });
      pairRuns.push(summary);
      console.log(JSON.stringify(summary));
    }
    assert.equal(pairRuns[0].digest, pairRuns[1].digest, "paired accepted sample data identical");
  }
  assert.deepEqual(errors, []);
  const report = {
    kind: "isolated whole-group export worker competing with separate actual-app iframe",
    physicalPen: false,
    setup,
    environment,
    browser: browser.version(),
    runs,
    limitations: [
      "Injected input; not physical Wacom",
      "Worker reuses process but each job recreates GPU resources",
      "Managed-heap samples exclude GPU and browser-native memory",
      "No actual-app export integration or input-prioritizing scheduler",
    ],
  };
  writeFileSync(".build-cache/svg01/responsiveness-results.json", JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
