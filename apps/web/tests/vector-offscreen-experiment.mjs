import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/worker-offscreen";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (let repeat = 0; repeat < 3; repeat++)
    for (const dense of [true])
      for (const mode of repeat % 2 ? ["worker", "main"] : ["main", "worker"]) {
        const page = await browser.newPage({
          viewport: { width: 1440, height: 1000 },
          deviceScaleFactor: 2,
        });
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.goto(
          (process.env.LINEFIELD_WORKER_FIXTURE_URL || "http://127.0.0.1:65343") +
            "/apps/web/tests/fixtures/worker-opportunities/offscreen.html",
        );
        await page.waitForFunction(() => !!window.offscreenExperiment);
        let watchdog;
        const row = await Promise.race([
          page.evaluate((scenario) => window.offscreenExperiment(scenario.mode), {
            dense,
            mode,
          }),
          new Promise((_, reject) => {
            watchdog = setTimeout(() => reject(Error("Offscreen scenario timeout")), 30000);
          }),
        ]).finally(() => clearTimeout(watchdog));
        if (errors.length) throw Error(errors.join("\n"));
        if (results.length && JSON.stringify(row.hashes) !== JSON.stringify(results[0].hashes))
          throw Error("Offscreen image parity mismatch");
        results.push({ repeat, ...row });
        await page.close();
        await writeFile(
          `${output}/results.json`,
          JSON.stringify(
            {
              hardware: { cpu: cpus()[0].model, memory: totalmem() },
              browser: browser.version(),
              notes:
                "Isolated production GPU primitive feasibility; twelve derived strokes, ordered coverage, no full renderer migration. Readback outside timing. Cold setup includes unchanged pencil material generation.",
              results,
            },
            null,
            2,
          ),
        );
        console.log(repeat, dense, mode, row.cold, row.hashes);
      }
} finally {
  await browser.close();
}
