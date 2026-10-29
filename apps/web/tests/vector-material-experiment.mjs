import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, totalmem, platform, release } from "node:os";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/worker-material";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (let repeat = 0; repeat < 5; repeat++) {
    const order = repeat % 2 ? ["asset", "worker", "sync"] : ["sync", "worker", "asset"];
    for (const variant of order) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        "http://127.0.0.1:65338/apps/web/tests/fixtures/worker-opportunities/index.html",
      );
      await page.waitForFunction(() => !!window.materialExperiment);
      const row = await page.evaluate((mode) => window.materialExperiment(mode), variant);
      if (errors.length) throw Error(errors.join("\n"));
      results.push({ repeat, ...row });
      await page.close();
      await writeFile(
        `${output}/results.json`,
        JSON.stringify(
          {
            hardware: {
              cpu: cpus()[0].model,
              logicalCpus: cpus().length,
              memory: totalmem(),
              platform: platform(),
              release: release(),
            },
            browser: browser.version(),
            notes:
              "Isolated real material bake/upload; fresh page and worker per sample; loopback uncompressed asset, not cold network. Fence polling is a completion proxy, not GPU timestamp. Readback excluded from timing. No shipping variant adopted by this experiment.",
            results,
          },
          null,
          2,
        ),
      );
      console.log(repeat, variant, row.readyMs.toFixed(1), row.hash);
    }
  }
  if (new Set(results.map((r) => r.hash)).size !== 1) throw Error("Material variants differ");
} finally {
  await browser.close();
}
