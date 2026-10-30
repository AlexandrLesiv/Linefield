import { recovery } from "./image-import-recovery.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  page = await browser.newPage();
await page.goto(process.env.LINEFIELD_IMAGE_URL || "http://127.0.0.1:65414/");
await page.waitForFunction(() => window.imageProbe);
const result = await page.evaluate(async () => {
  const out = [];
  for (const [width, height] of [
    [1, 4096],
    [4096, 1],
    [17, 13],
    [4096, 4096],
  ]) {
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext("2d");
    const blob = await canvas.convertToBlob({ type: "image/png" });
    window.imageProbe.reset();
    const image = await window.imageProbe.importBlob(blob, "worker", "mipmap");
    out.push({ width, height, bytes: image.gpuEstimatedBytes });
  }
  window.imageProbe.reset();
  const gl = new OffscreenCanvas(1, 1).getContext("webgl2"),
    ext = gl.getExtension("WEBGL_debug_renderer_info");
  const gpu = {
    version: gl.getParameter(gl.VERSION),
    renderer: gl.getParameter(gl.RENDERER),
    unmasked: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
    userAgent: navigator.userAgent,
    dpr: devicePixelRatio,
  };
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { rows: out, gpu };
});
const { rows } = result;
for (const row of rows) {
  let w = row.width,
    h = row.height,
    total = w * h;
  while (w > 1 || h > 1) {
    w = Math.max(1, Math.floor(w / 2));
    h = Math.max(1, Math.floor(h / 2));
    total += w * h;
  }
  assert.equal(row.bytes, total * 4);
}
const out = "../../.build-cache/img01/budget";
await mkdir(out, { recursive: true });
await writeFile(`${out}/results.json`, JSON.stringify(rows, null, 2));
await writeFile(
  "../../.build-cache/img01/environment-gpu.json",
  JSON.stringify(result.gpu, null, 2),
);
const recoveryChecks = await page.evaluate(recovery);
await writeFile(`${out}/recovery.json`, JSON.stringify(recoveryChecks, null, 2));
console.log({ ...result, recoveryChecks });
await browser.close();
