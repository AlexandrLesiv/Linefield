import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { inputSession } from "./vector-svg-input-session.mjs";
import { seedSvgDocument } from "./vector-svg-app-setup.mjs";
import { createHash } from "node:crypto";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Separate actual SVG02 application required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg02/performance";
await mkdir(output, { recursive: true });
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * p)] ?? 0;
const stats = (values) => ({
  median: percentile(values, 0.5),
  p99: percentile(values, 0.99),
  max: Math.max(0, ...values),
});
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab && !!document.querySelector("#svg-export-open"));
  const setup = await frame.evaluate(seedSvgDocument);
  const warmup = await frame.evaluate(inputSession, {
    device: "pen",
    count: 30,
    visibleOnly: true,
  });
  const runs = [];
  for (let pair = 0; pair < 5; pair++) {
    const device = pair % 2 ? "mouse" : "pen";
    let baselineDigest;
    for (const exporting of [false, true]) {
      let started = 0;
      if (exporting) {
        await frame.locator("#editor-settings-toggle").click();
        await frame.locator("#svg-export-open").click();
        await frame.locator("#svg-background").selectOption("transparent");
        started = Date.now();
        await frame.locator("#svg-export-start").click();
      }
      const raw = await frame.evaluate(inputSession, {
        device,
        count: 480,
        interval: 8,
        visibleOnly: true,
      });
      const digest = createHash("sha256").update(JSON.stringify(raw.raw)).digest("hex");
      if (!exporting) baselineDigest = digest;
      else assert.equal(digest, baselineDigest, "paired accepted stroke data");
      assert.equal(raw.raw.length, 481);
      assert.equal(raw.priorRawUnchanged, true);
      let exportResult = null;
      if (exporting) {
        await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 90000 });
        exportResult = await frame.evaluate(async () => {
          const href = document.querySelector("#svg-export-download").href;
          const svg = await (await fetch(href)).text();
          return {
            bytes: new Blob([svg]).size,
            images: new DOMParser().parseFromString(svg, "image/svg+xml").querySelectorAll("image")
              .length,
          };
        });
        exportResult.totalMs = Date.now() - started;
        await frame.locator("#svg-export-notice button", { hasText: "Close" }).click();
      }
      await frame.evaluate(() => lab.saving.flush(true));
      assert.equal(await frame.evaluate(() => lab.saving.state().phase), "saved");
      runs.push({
        pair,
        exporting,
        device,
        digest,
        exportResult,
        frames: stats(raw.frames),
        dispatch: stats(raw.delays),
        longTasks: raw.longTasks,
        raw,
      });
      await frame.evaluate(async () => {
        document.querySelector("#undo").click();
        while (lab.renderPending()) await new Promise(requestAnimationFrame);
        await lab.saving.flush(true);
      });
    }
  }
  const environment = await frame.evaluate(() => ({
    ua: navigator.userAgent,
    dpr: devicePixelRatio,
    width: innerWidth,
    height: innerHeight,
  }));
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      {
        setup,
        warmup,
        environment,
        runs,
        physicalPen: false,
        note: "Export deliberately pauses during active input; total time includes the drawing gesture.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(runs.map(({ raw: _raw, ...summary }) => summary)));
} finally {
  await browser.close();
}
