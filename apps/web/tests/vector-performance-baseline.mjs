import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, platform, release, totalmem } from "node:os";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/performance-baseline";
const freezeBoundsProbe = process.env.LINEFIELD_FREEZE_BOUNDS_PROBE === "1";
const profileCpu = process.env.LINEFIELD_CPU_PROFILE === "1";
const referenceIntegrated = process.env.LINEFIELD_REFERENCE_INTEGRATED === "1";
const workload = {
  zoomCycles: Number(process.env.LINEFIELD_ZOOM_CYCLES || 1),
  historyCycles: Number(process.env.LINEFIELD_HISTORY_CYCLES || 1),
  selectionOnly: process.env.LINEFIELD_SELECTION_ONLY === "1",
  regionalTransitions: process.env.LINEFIELD_REGIONAL_TRANSITIONS === "1",
  strokes: Number(process.env.LINEFIELD_STROKES || 24),
  samplesPerStroke: Number(process.env.LINEFIELD_SAMPLES_PER_STROKE || 129),
};
if (
  !Number.isInteger(workload.strokes) ||
  workload.strokes < 1 ||
  workload.strokes > 1024 ||
  !Number.isInteger(workload.samplesPerStroke) ||
  workload.samplesPerStroke < 2 ||
  workload.samplesPerStroke > 16385
)
  throw Error("Workload must contain 1–1024 strokes and 2–16385 samples per stroke");
if (!Number.isInteger(workload.zoomCycles) || workload.zoomCycles < 1 || workload.zoomCycles > 8)
  throw Error("Zoom cycles must be 1–8");
if (
  !Number.isInteger(workload.historyCycles) ||
  workload.historyCycles < 1 ||
  workload.historyCycles > 100
)
  throw Error("History cycles must be 1–100");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (let repeat = 0; repeat < 3; repeat++)
    for (const integrated of repeat % 2 ? [true, false] : [false, true]) {
      const embedded = integrated || referenceIntegrated;
      const page = await browser.newPage({
        viewport: { width: 1440, height: embedded ? 1000 : 948 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const started = performance.now();
      await page.goto(
        integrated
          ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65283/"
          : process.env.LINEFIELD_REFERENCE_URL || "http://127.0.0.1:65280/",
      );
      if (embedded) await page.locator(".new-tile").click();
      const host = embedded ? page.frameLocator("iframe") : page;
      await host.locator("#brush").waitFor();
      const frame = embedded
        ? page.frames().find((candidate) => candidate.url().includes("/vector-editor/"))
        : page.mainFrame();
      await frame.waitForFunction(() => !!window.lab, {}, { timeout: 30000 });
      const readinessMs = performance.now() - started;
      const profiler = profileCpu ? await page.context().newCDPSession(page) : null;
      if (profiler) {
        await profiler.send("Profiler.enable");
        await profiler.send("Profiler.setSamplingInterval", { interval: 250 });
        await profiler.send("Profiler.start");
      }
      const measurementWorkload = {
        ...workload,
        freezeInputBounds: freezeBoundsProbe && integrated,
      };
      const measurement = await frame.evaluate(async (scenario) => {
        const canvas = document.querySelector("canvas"),
          rect = canvas.getBoundingClientRect();
        const gl = canvas.getContext("webgl2"),
          debug = gl.getExtension("WEBGL_debug_renderer_info");
        const renderer = debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER);
        const next = () => new Promise((resolve) => requestAnimationFrame(resolve));
        const quantiles = (values) => {
          const sorted = [...values].sort((a, b) => a - b);
          return {
            count: sorted.length,
            median: sorted[Math.floor(sorted.length * 0.5)] ?? null,
            p95: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? null,
            max: sorted.at(-1) ?? null,
          };
        };
        async function settled() {
          const start = performance.now();
          while (lab.renderPending()) {
            if (performance.now() - start > 30000) throw Error("render did not settle");
            await next();
          }
          return performance.now() - start;
        }
        const phases = [];
        let phaseTasks = [];
        const observer = new PerformanceObserver((list) => {
          phaseTasks.push(
            ...list.getEntries().map((e) => ({ startTime: e.startTime, duration: e.duration })),
          );
        });
        observer.observe({ type: "longtask" });
        async function phase(name, action) {
          await settled();
          for (const value of Object.values(lab.metrics))
            if (Array.isArray(value)) value.length = 0;
          phaseTasks = [];
          const frames = [];
          let running = true;
          let last;
          function tick(t) {
            if (last !== undefined) frames.push(t - last);
            last = t;
            if (running) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
          const start = performance.now();
          await action();
          const actionMs = performance.now() - start;
          const renderSettledWaitMs = await settled();
          running = false;
          await next();
          const metrics = Object.fromEntries(
            Object.entries(lab.metrics).map(([k, v]) => [k, Array.isArray(v) ? quantiles(v) : v]),
          );
          phases.push({
            name,
            actionMs,
            renderSettledWaitMs,
            rafIntervals: quantiles(frames),
            longTasks: quantiles(
              phaseTasks.filter((e) => e.startTime >= start).map((e) => e.duration),
            ),
            longTaskEntries: phaseTasks,
            phaseStart: start,
            phaseEnd: performance.now(),
            metrics,
          });
        }
        function control(id, value) {
          const e = document.querySelector("#" + id);
          e.value = String(value);
          e.dispatchEvent(new Event("input", { bubbles: true }));
          e.dispatchEvent(new Event("change", { bubbles: true }));
        }
        function pointer(type, x, y, pressure = 0.7) {
          canvas.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 777,
              pointerType: "pen",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure,
              clientX: rect.x + x,
              clientY: rect.y + y,
            }),
          );
        }
        const captureNames = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"];
        const descriptors = captureNames.map((key) => Object.getOwnPropertyDescriptor(canvas, key));
        let captured = false;
        canvas.setPointerCapture = () => {
          captured = true;
        };
        canvas.hasPointerCapture = () => captured;
        canvas.releasePointerCapture = () => {
          captured = false;
        };
        const rawBefore = () =>
          Array.from({ length: lab.core.count() }, (_, id) =>
            Array.from({ length: lab.core.raw_length(id) }, (unused, index) =>
              [0, 1, 2].map((field) => lab.core.raw_point(id, index, field)),
            ),
          );
        try {
          const boundsDescriptor = Object.getOwnPropertyDescriptor(canvas, "getBoundingClientRect");
          const readBounds = canvas.getBoundingClientRect.bind(canvas);
          if (scenario.freezeInputBounds)
            Object.defineProperty(canvas, "getBoundingClientRect", {
              configurable: true,
              value: () => rect,
            });
          try {
            await phase("cold-mixed-drawing", async () => {
              for (let stroke = 0; stroke < scenario.strokes; stroke++) {
                control("brush", stroke % 3);
                control("width", 24);
                control("opacity", stroke % 2 ? 55 : 100);
                if (scenario.freezeInputBounds) {
                  const actual = readBounds();
                  if (["x", "y", "width", "height"].some((key) => actual[key] !== rect[key]))
                    throw Error("Bounds probe requires a static layout");
                }
                pointer("pointerdown", 180, 240 + (stroke % 8) * 18);
                for (let i = 1; i < scenario.samplesPerStroke; i++)
                  pointer(
                    "pointermove",
                    180 + (i * 896) / (scenario.samplesPerStroke - 1),
                    240 +
                      (stroke % 8) * 18 +
                      Math.round(Math.sin((i * 12.8) / (scenario.samplesPerStroke - 1)) * 60),
                    0.2 + (0.8 * (i % 31)) / 30,
                  );
                pointer(
                  "pointerup",
                  1076,
                  240 + (stroke % 8) * 18 + Math.round(Math.sin(12.8) * 60),
                  0,
                );
                await next();
              }
            });
          } finally {
            if (scenario.freezeInputBounds) {
              if (boundsDescriptor)
                Object.defineProperty(canvas, "getBoundingClientRect", boundsDescriptor);
              else delete canvas.getBoundingClientRect;
            }
          }
          if (lab.core.count() !== scenario.strokes)
            throw Error("Input workload did not commit every stroke");
          const sampleCount = rawBefore().reduce((sum, points) => sum + points.length, 0);
          if (sampleCount !== scenario.strokes * scenario.samplesPerStroke)
            throw Error(`Accepted sample count mismatch: ${sampleCount}`);
          const saved = JSON.stringify(rawBefore());
          const selectionQueries = [];
          if (scenario.selectionOnly) {
            for (const partial of [true, false]) {
              await phase(partial ? "partial-lasso" : "whole-lasso", async () => {
                document.querySelector("#select").click();
                document.querySelector("#selection-lasso-mode").click();
                document.querySelector("#selection-partial").checked = partial;
                const corners = [
                  [120, 150],
                  [1150, 150],
                  [1150, 470],
                  [120, 470],
                  [120, 150],
                ];
                for (let query = 0; query < 12; query++) {
                  document.querySelector("#selection-clear").click();
                  pointer("pointerdown", ...corners[0]);
                  const steps = query % 2 ? 320 : 1;
                  for (let edge = 0; edge < 4; edge++)
                    for (let i = 1; i <= steps; i++) {
                      pointer(
                        "pointermove",
                        corners[edge][0] + ((corners[edge + 1][0] - corners[edge][0]) * i) / steps,
                        corners[edge][1] + ((corners[edge + 1][1] - corners[edge][1]) * i) / steps,
                      );
                    }
                  const start = performance.now();
                  pointer("pointerup", ...corners.at(-1));
                  const completionMs = performance.now() - start;
                  const ids = lab.selection();
                  if (ids.length !== scenario.strokes) throw Error("Lasso missed accepted strokes");
                  selectionQueries.push({ partial, dense: steps > 1, completionMs, ids });
                  await next();
                }
              });
            }
          }
          if (!scenario.selectionOnly) {
            if (scenario.regionalTransitions && typeof lab.viewOrigin === "function") {
              await phase("regional-origin-roundtrips-integrated-only", async () => {
                document.querySelector("#pan").click();
                pointer("pointerdown", 700, 450);
                for (let i = 0; i < 12; i++) {
                  pointer("pointermove", 700 - (i % 2 ? 0 : 4294901760), 450);
                  await next();
                  await settled();
                }
                pointer("pointerup", 700, 450);
              });
            }
            await phase("warm-continuous-pan", async () => {
              document.querySelector("#pan").click();
              pointer("pointerdown", 700, 450);
              for (let i = 1; i <= 60; i++) {
                pointer(
                  "pointermove",
                  700 + Math.round(Math.sin(i * 0.1) * 180),
                  450 + Math.round(Math.cos(i * 0.1) * 100),
                );
                await next();
              }
              pointer(
                "pointerup",
                700 + Math.round(Math.sin(6) * 180),
                450 + Math.round(Math.cos(6) * 100),
              );
            });
            await phase("rapid-zoom", async () => {
              for (let cycle = 0; cycle < scenario.zoomCycles; cycle++) {
                for (const zoom of [0.05, 0.1, 0.5, 1, 4, 16, 8, 1, 0.05, 1]) {
                  canvas.dispatchEvent(
                    new WheelEvent("wheel", {
                      bubbles: true,
                      cancelable: true,
                      clientX: rect.x + 700,
                      clientY: rect.y + 400,
                      deltaY: -Math.log(zoom / lab.view().zoom) / 0.001,
                    }),
                  );
                  await next();
                }
                if (scenario.zoomCycles > 1) await settled();
              }
            });
            await phase("continuous-rotation", async () => {
              document.querySelector("#rotate").click();
              const cx = rect.width / 2,
                cy = rect.height / 2;
              pointer("pointerdown", cx + 180, cy);
              for (let i = 1; i <= 60; i++) {
                pointer(
                  "pointermove",
                  cx + Math.cos(i * 0.06) * 180,
                  cy + Math.sin(i * 0.06) * 180,
                );
                await next();
              }
              pointer("pointerup", cx + Math.cos(3.6) * 180, cy + Math.sin(3.6) * 180);
            });
            await phase("history", async () => {
              for (let cycle = 0; cycle < scenario.historyCycles; cycle++) {
                document.querySelector("#undo").click();
                await next();
                await settled();
                document.querySelector("#redo").click();
                await next();
                await settled();
              }
            });
          }
          if (JSON.stringify(rawBefore()) !== saved) throw Error("Camera/history changed raw data");
          return {
            renderer,
            canvas: [canvas.width, canvas.height],
            dpr: devicePixelRatio,
            strokes: lab.core.count(),
            rawSamples: rawBefore().reduce((sum, points) => sum + points.length, 0),
            phases,
            selectionQueries,
            memory: {
              wasmBytes: lab.core.memory.buffer.byteLength,
              material: lab.brushStats(),
              cache: lab.cacheState(),
            },
            rawPreserved: true,
          };
        } finally {
          observer.disconnect();
          captureNames.forEach((key, i) =>
            descriptors[i]
              ? Object.defineProperty(canvas, key, descriptors[i])
              : delete canvas[key],
          );
        }
      }, measurementWorkload);
      if (profiler) {
        const { profile } = await profiler.send("Profiler.stop");
        await writeFile(
          `${output}/cpu-${repeat}-${integrated ? "integrated" : "reference"}.json`,
          JSON.stringify(profile),
        );
        await profiler.detach();
      }
      results.push({ repeat, integrated, readinessMs, errors, measurement });
      await page.close();
      await writeFile(
        `${output}/results.json`,
        JSON.stringify(
          {
            workload,
            referenceIntegrated,
            hardware: {
              cpu: cpus()[0]?.model,
              logicalCpus: cpus().length,
              totalMemory: totalmem(),
              platform: platform(),
              release: release(),
            },
            browser: browser.version(),
            headless: true,
            gpuQueries: false,
            cpuProfileDiagnostic: profileCpu,
            staticInputBoundsDiagnostic: freezeBoundsProbe,
            notes:
              "Synthetic DOM input; readiness includes navigation and shell animation. Frame submission and rAF are not physical input-to-display or GPU duration. Render settlement is the engine pending-state proxy, not measured time to correct displayed pixels. No worker transfer/turnaround instrumentation in this baseline.",
            results,
          },
          null,
          2,
        ),
      );
      if (errors.length) throw Error(errors.join("\n"));
      console.log("recorded", repeat, integrated ? "integrated" : "reference");
    }
} finally {
  await browser.close();
}
