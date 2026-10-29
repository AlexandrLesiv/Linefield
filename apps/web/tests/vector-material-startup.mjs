import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { cpus, totalmem } from "node:os";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/worker-material/startup";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  rows = [];
try {
  for (let repeat = 0; repeat < 5; repeat++)
    for (const candidate of repeat % 2 ? [true, false] : [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      await page.addInitScript(() => {
        const state = (window.startupTrace = { frames: [], tasks: [] });
        let last;
        function tick(time) {
          if (last !== undefined) state.frames.push(time - last);
          last = time;
          if (state.frames.length < 1000) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        new PerformanceObserver((list) =>
          state.tasks.push(...list.getEntries().map((e) => e.duration)),
        ).observe({ type: "longtask" });
      });
      const url = candidate
        ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65340/"
        : "http://127.0.0.1:65337/";
      await page.goto(url);
      const start = performance.now();
      await page.locator(".new-tile").click();
      await page.frameLocator("iframe").locator("#brush").waitFor();
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab && !lab.renderPending());
      const readyMs = performance.now() - start;
      const state = await frame.evaluate(() => ({
        ...window.startupTrace,
        stats: lab.brushStats(),
        renderer: document.querySelector("canvas").getContext("webgl2").getParameter(7937),
      }));
      rows.push({ repeat, candidate, url, readyMs, state });
      await page.close();
      console.log(repeat, candidate, readyMs.toFixed(1));
    }
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      {
        hardware: { cpu: cpus()[0].model, memory: totalmem() },
        browser: browser.version(),
        notes:
          "Fresh page per run; cached OS/network resources possible. New-tile click through renderPending=false includes shell transition, not physical display latency. No readback or GPU timestamp instrumentation.",
        rows,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
