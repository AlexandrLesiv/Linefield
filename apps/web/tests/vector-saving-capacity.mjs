import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
import { processMemory, drawingDigest, ready } from "./vector-saving-capacity-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Explicit isolated capacity candidate URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/save07-capacity";
const counts = (process.env.LINEFIELD_SAMPLE_COUNTS || "1050000,1350000").split(",").map(Number);
const repetitions = Number(process.env.LINEFIELD_CAPACITY_RUNS || 1);
const expectRejected = process.env.LINEFIELD_EXPECT_CAPACITY_REJECTION === "1";
await mkdir(output, { recursive: true });
const results = [];
for (const sampleCount of counts)
  for (let iteration = 0; iteration < repetitions; iteration++) {
    const server = await chromium.launchServer({ channel: "chrome", headless: true });
    const memory = processMemory(server.process().pid);
    const browser = await chromium.connect(server.wsEndpoint());
    try {
      const context = await browser.newContext({
        viewport: { width: 1200, height: 1000 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("dialog", (d) => d.accept());
      await page.addInitScript(() => {
        const gaps = [],
          tasks = [];
        let previous = 0;
        const tick = (time) => {
          if (previous) gaps.push(time - previous);
          previous = time;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        new PerformanceObserver((list) =>
          tasks.push(...list.getEntries().map((e) => e.duration)),
        ).observe({ type: "longtask", buffered: true });
        globalThis.capacityTiming = { gaps, tasks };
      });
      await page.goto(url);
      await page.locator(".new-tile").click();
      let frame = await ready(page);
      memory.phase("seed-outside-performance-window");
      const seed = await frame.evaluate(async (samples) => {
        const e = lab.core,
          started = performance.now();
        e.begin_with_style(7, 0x245788, 0.2, 1.4, 0.7);
        for (let i = 0; i < 16; i++)
          e.push_precise(100 + i * 8, 200 + Math.sin(i) * 8, 0.3 + i / 30);
        e.commit();
        for (let brush = 0; brush < 3; brush++) {
          e.begin_with_style(12, 0x315a93, 0.1, 1.5, 0.65);
          e.set_active_brush(brush);
          const size = Math.floor(samples / 3) + (brush === 2 ? samples % 3 : 0);
          for (let start = 0; start < size; start += 4096) {
            for (let i = start; i < Math.min(start + 4096, size); i++)
              e.push_precise(
                10000000 + (i % 1000) * 0.003,
                10000000 + brush * 100 + Math.floor(i / 1000) * 0.01,
                0.1 + (i % 9) / 10,
              );
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
          e.commit();
        }
        lab.requestRedraw();
        return {
          ms: performance.now() - started,
          status: e.delta_status(),
          revision: String(e.delta_revision()),
        };
      }, sampleCount);
      const before = await drawingDigest(frame);
      assert.equal(before.samples, sampleCount + 16);
      memory.phase("save");
      const save = await frame.evaluate(async () => {
        const started = performance.now();
        try {
          await lab.saving.flush(true);
          return { ok: true, ms: performance.now() - started };
        } catch (error) {
          return { ok: false, ms: performance.now() - started, error: String(error) };
        }
      });
      const result = {
        url,
        sampleCount,
        sourceBytes: (sampleCount + 16) * 40,
        iteration,
        seed,
        before,
        save,
        browser: browser.version(),
      };
      if (expectRejected) {
        assert.equal(save.ok, false);
        assert.deepEqual(await drawingDigest(frame), before);
        result.rejectedWithoutDataLoss = true;
      } else {
        assert.equal(save.ok, true, JSON.stringify(save));
        const worker = page.workers().find((w) => w.url().includes("/saving/worker.js"));
        result.storedBatchBytes = await worker.evaluate(() =>
          database.manifest().batches.reduce((sum, batch) => sum + batch.bytes, 0),
        );
        if (sampleCount >= 1350000) assert(result.storedBatchBytes > 48 * 1024 * 1024);
        await frame.waitForFunction(() => !lab.renderPending(), null, { timeout: 120000 });
        const pixels = await frame.locator("canvas").screenshot();
        await writeFile(`${output}/${sampleCount}-${iteration}-before.png`, pixels);
        memory.phase("restore");
        const started = Date.now();
        await page.reload();
        frame = await ready(page);
        result.readyMs = Date.now() - started;
        result.restoreTiming = await page.evaluate(() => ({
          maxFrameGap: Math.max(0, ...capacityTiming.gaps),
          maxLongTask: Math.max(0, ...capacityTiming.tasks),
          longTaskCount: capacityTiming.tasks.length,
        }));
        memory.phase("verify-outside-performance-window");
        assert.deepEqual(await drawingDigest(frame), before);
        await frame.waitForFunction(() => !lab.renderPending(), null, { timeout: 120000 });
        assert.deepEqual(await frame.locator("canvas").screenshot(), pixels);
        result.exactReload = true;
      }
      assert.deepEqual(errors, []);
      result.memory = await memory.stop();
      results.push(result);
      await writeFile(
        output + "/results.json",
        JSON.stringify(
          {
            hardware: { cpu: cpus()[0]?.model, ram: totalmem() },
            viewport: { width: 1200, height: 1000, dpr: 2 },
            note: "Offscreen large sources isolate storage capacity from large-geometry rendering; small visible stroke image checked. Seeding and digest verification are excluded from responsiveness timing. Sampled process-tree RSS is not private/GPU memory.",
            results,
          },
          null,
          2,
        ),
      );
      console.log(
        JSON.stringify({
          sampleCount,
          iteration,
          save,
          readyMs: result.readyMs,
          exactReload: result.exactReload,
          peaks: result.memory.peaks,
        }),
      );
      await context.close();
    } finally {
      await memory.stop();
      await browser.close();
      await server.close();
    }
  }
