import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { inputSession } from "./vector-svg-input-session.mjs";
import { seedSvgDocument } from "./vector-svg-app-setup.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated actual app required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/img01/responsiveness";
await mkdir(output, { recursive: true });
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    p99: sorted[Math.floor((sorted.length - 1) * 0.99)] ?? 0,
    max: Math.max(0, ...values),
  };
};
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
  await frame.waitForFunction(() => !!window.lab);
  const setup = await frame.evaluate(seedSvgDocument);
  // Fixture is imported into the editor's own event loop, never a second tab/process.
  await frame.evaluate(
    async ({ size, sampling }) => {
      await import("/image-import/probe.js");
      window.imageSampling = sampling;
      const canvas = new OffscreenCanvas(size, size),
        ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, "#8e133e");
      gradient.addColorStop(1, "#43c8e6");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      window.imageInput = await canvas.convertToBlob({ type: "image/png" });
    },
    {
      size: Number(process.env.LINEFIELD_IMAGE_SIZE ?? 4096),
      sampling: process.env.LINEFIELD_IMAGE_SAMPLING ?? "linear",
    },
  );
  await frame.evaluate(inputSession, { device: "pen", count: 30, visibleOnly: true });
  const runs = [];
  for (let pair = 0; pair < Number(process.env.LINEFIELD_IMAGE_PAIRS ?? 5); pair++) {
    let baselineDigest;
    const variants = (process.env.LINEFIELD_IMAGE_MODES ?? "main,worker,worker-idle-upload").split(
      ",",
    );
    const order = [
      ...variants.slice(pair % variants.length),
      ...variants.slice(0, pair % variants.length),
    ];
    for (const mode of ["baseline", ...order]) {
      await frame.evaluate((lane) => {
        window.imageImportResult = null;
        imageProbe.setUploadGate(
          lane === "worker-idle-upload"
            ? async () => {
                if (window.checkpointDrawing)
                  await new Promise((resolve) => {
                    document.addEventListener("pointerup", resolve, { once: true });
                  });
                await new Promise(requestAnimationFrame);
                await new Promise(requestAnimationFrame);
              }
            : async () => {},
        );
        window.checkpointDrawing = true;
        document.addEventListener(
          "pointerup",
          () => {
            window.checkpointDrawing = false;
          },
          { once: true },
        );
        window.imageImportDone = null;
        if (lane !== "baseline") {
          window.imageImportDone = new Promise((resolve) => setTimeout(resolve, 150)).then(
            async () => {
              const result = await imageProbe.importBlob(
                imageInput,
                lane === "main" ? "main" : "worker",
                window.imageSampling,
              );
              const presentStart = performance.now();
              imageProbe.present(
                [{ kind: "image", id: result.id, transform: [0.25, 0, 0, 0.25, 0, 0], opacity: 1 }],
                { width: 1024, height: 1024, background: "white" },
              );
              window.imageImportResult = {
                ...result,
                presentSubmissionMs: performance.now() - presentStart,
              };
            },
          );
        }
      }, mode);
      const raw = await frame.evaluate(inputSession, {
        device: pair % 2 ? "mouse" : "pen",
        count: 240,
        interval: 8,
        visibleOnly: true,
      });
      const digest = createHash("sha256").update(JSON.stringify(raw.raw)).digest("hex");
      if (mode === "baseline") baselineDigest = digest;
      else assert.equal(digest, baselineDigest);
      assert.equal(raw.raw.length, 241);
      assert.equal(raw.priorRawUnchanged, true);
      const imported = await frame.evaluate(async () => {
        await window.imageImportDone;
        return window.imageImportResult;
      });
      assert.equal(await frame.evaluate(() => lab.saving.state().phase), "saved");
      runs.push({
        pair,
        mode,
        digest,
        imported,
        frames: stats(raw.frames),
        framesDuringInput: stats(raw.frames.filter((_, i) => raw.frameAt[i] <= raw.inputEnd)),
        dispatch: stats(raw.delays),
        longTasks: raw.longTasks,
        raw,
      });
      await frame.evaluate(async () => {
        imageProbe.reset();
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
        environment,
        runs,
        note: "Synthetic accepted input; separate checkpoint GPU context in same UI thread. Not production integration or physical pen latency.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(runs.map(({ raw: _raw, ...summary }) => summary)));
} finally {
  await browser.close();
}
