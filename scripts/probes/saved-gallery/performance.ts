import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import type { Browser } from "../../../node_modules/.pnpm/playwright-core@1.64.1/node_modules/playwright-core/index.js";
const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium } = require("@playwright/test") as {
  chromium: { launch(options: object): Promise<Browser> };
};
const base = process.env.LINEFIELD_PREVIEW_URL ?? "http://127.0.0.1:65354";
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/save07-baseline";
const strokeCount = Number(process.env.LINEFIELD_STROKE_COUNT ?? "40");
if (!Number.isSafeInteger(strokeCount) || strokeCount <= 0)
  throw Error("LINEFIELD_STROKE_COUNT must be a positive safe integer");
const prefillBatches = Number(process.env.LINEFIELD_PREFILL_BATCHES ?? "0");
if (!Number.isSafeInteger(prefillBatches) || prefillBatches < 0 || prefillBatches > 10000)
  throw Error("LINEFIELD_PREFILL_BATCHES must be an integer from 0 to 10000");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const runs: unknown[] = [];
try {
  for (let run = 0; run < 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 1200, height: 1000 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(base);
    await page.locator(".new-tile").click();
    await page.locator("iframe:not([hidden])").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    if (!frame) throw Error("Missing editor");
    await frame.waitForFunction(() => !!(window as unknown as { lab?: unknown }).lab);
    const result = await frame.evaluate(
      async ({ count, prefill }) => {
        type Lab = {
          core: {
            count(): number;
            raw_length(id: number): number;
            document_settings(paper: number, grid: number): void;
          };
          saving: {
            flush(exit: boolean): Promise<void>;
            state(): { revision: bigint; durable: bigint };
            metrics: { phase: string; ms: number }[];
            maintenanceStatus?(): Promise<unknown>;
          };
        };
        const lab = (window as unknown as { lab: Lab }).lab;
        for (let batch = 0; batch < prefill; batch++) {
          lab.core.document_settings(batch % 2, 0);
          await lab.saving.flush(true);
        }
        const maintenanceBefore = await lab.saving.maintenanceStatus?.();
        lab.saving.metrics.length = 0;
        const canvas = document.querySelector("canvas")!;
        const rect = canvas.getBoundingClientRect();
        const delays: number[] = [],
          frames: number[] = [];
        let alive = true,
          last = 0;
        const frameTime = (time: number) => {
          if (last) frames.push(time - last);
          last = time;
          if (alive) requestAnimationFrame(frameTime);
        };
        requestAnimationFrame(frameTime);
        const start = performance.now();
        for (let stroke = 0; stroke < count; stroke++) {
          const pointerType = stroke % 2 ? "pen" : "mouse";
          const emit = (kind: string, step: number) =>
            canvas.dispatchEvent(
              new PointerEvent(kind, {
                bubbles: true,
                pointerId: 1,
                isPrimary: true,
                pointerType,
                button: kind === "pointermove" ? -1 : 0,
                buttons: kind === "pointerup" ? 0 : 1,
                pressure: kind === "pointerup" ? 0 : 0.5,
                clientX: rect.x + 100 + step * 3,
                clientY: rect.y + 200 + stroke * 6 + Math.sin(step / 10) * 20,
              }),
            );
          emit("pointerdown", 0);
          for (let step = 1; step <= 60; step++) {
            const before = performance.now();
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
            delays.push(performance.now() - before);
            emit("pointermove", step);
          }
          emit("pointerup", 60);
        }
        const inputDone = performance.now();
        await lab.saving.flush(true);
        const saveDone = performance.now();
        alive = false;
        const stats = (values: number[]) => {
          const v = values.slice().sort((a, b) => a - b);
          return {
            count: v.length,
            median: v[Math.floor(v.length * 0.5)] ?? 0,
            p95: v[Math.floor(v.length * 0.95)] ?? 0,
            p99: v[Math.floor(v.length * 0.99)] ?? 0,
            max: v.at(-1) ?? 0,
          };
        };
        return {
          strokes: lab.core.count(),
          raw: Array.from({ length: lab.core.count() }, (_, i) => lab.core.raw_length(i)),
          delays: stats(delays),
          frames: stats(frames),
          saveCalls: stats(lab.saving.metrics.map((m) => m.ms)),
          maintenanceBefore,
          maintenanceAfter: await lab.saving.maintenanceStatus?.(),
          elapsed: inputDone - start,
          flushMs: saveDone - inputDone,
          revision: String(lab.saving.state().revision),
          durable: String(lab.saving.state().durable),
          dpr: devicePixelRatio,
        };
      },
      { count: strokeCount, prefill: prefillBatches },
    );
    if (
      result.strokes !== strokeCount ||
      result.saveCalls.count === 0 ||
      result.raw.some((length) => length !== 61) ||
      result.revision !== result.durable
    )
      throw Error("Lost input or failed save");
    runs.push(result);
    await context.close();
  }
  writeFileSync(
    output + "/results.json",
    JSON.stringify(
      {
        base,
        strokeCount,
        prefillBatches,
        browser: browser.version(),
        cpu: cpus()[0]?.model,
        ram: totalmem(),
        viewport: { width: 1200, height: 1000 },
        evidence:
          "Injected mouse/pen events; scheduling delay includes timer clamp, not physical latency. No GPU timing claim.",
        runs,
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(runs));
} finally {
  await browser.close();
}
