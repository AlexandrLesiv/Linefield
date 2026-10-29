import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/worker-planner";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (let repeat = 0; repeat < 3; repeat++)
    for (const dense of [false, true])
      for (const mode of repeat % 2 ? ["worker", "main"] : ["main", "worker"]) {
        const page = await browser.newPage({
          viewport: { width: 1440, height: 1000 },
          deviceScaleFactor: 2,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          (process.env.LINEFIELD_WORKER_FIXTURE_URL || "http://127.0.0.1:65343") +
            "/apps/web/tests/fixtures/worker-opportunities/planner.html",
        );
        await page.waitForFunction(() => !!window.plannerExperiment);
        let watchdog;
        const row = await Promise.race([
          page.evaluate((scenario) => window.plannerExperiment(scenario.dense, scenario.mode), {
            dense,
            mode,
          }),
          new Promise((_, reject) => {
            watchdog = setTimeout(() => reject(Error("Planner scenario timeout")), 30000);
          }),
        ]).finally(() => clearTimeout(watchdog));
        if (errors.length) throw Error(errors.join("\n"));
        results.push({ repeat, ...row });
        await page.close();
        await writeFile(
          `${output}/results.json`,
          JSON.stringify(
            {
              hardware: { cpu: cpus()[0].model, memory: totalmem() },
              browser: browser.version(),
              notes:
                "Isolated production planner and projection kernels on disposable geometry from actual Rust strokes. No GPU rendering or input/display latency measurement. One scene snapshot, at most one in-flight plan plus one latest replacement. Six exact route-plan comparisons precede timing; 96 paced camera updates per sample.",
              results,
            },
            null,
            2,
          ),
        );
        console.log(repeat, dense, mode, row.stale, row.peakPending);
      }
} finally {
  await browser.close();
}
