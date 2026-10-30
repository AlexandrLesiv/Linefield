import { recovery } from "./image-import-recovery.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { hiddenRgbPng } from "./image-import-png.mjs";
const out = process.env.LINEFIELD_IMAGE_OUT || "../../.build-cache/img01/checkpoint";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const page = await browser.newPage({
  viewport: { width: 1200, height: 900 },
  deviceScaleFactor: 2,
});
await page.goto(process.env.LINEFIELD_IMAGE_URL || "http://127.0.0.1:65404/");
await page.waitForFunction(() => window.imageProbe);
const timeout = setTimeout(() => {
  console.error("Checkpoint exceeded 180 seconds");
  void browser.close();
}, 180000);
page.on("console", (m) => console.log(m.text()));
const results = await page.evaluate(async (hidden) => {
  const probe = window.imageProbe,
    checks = [],
    timings = [],
    matrix = [],
    artifacts = [];
  const make = async (size, type, noisy = false) => {
    const c = new OffscreenCanvas(size, size),
      ctx = c.getContext("2d");
    if (noisy) {
      const data = ctx.createImageData(size, size);
      let seed = 123;
      for (let i = 0; i < data.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        data.data[i] = seed & 255;
        data.data[i + 1] = (seed >>> 8) & 255;
        data.data[i + 2] = (seed >>> 16) & 255;
        data.data[i + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
    } else {
      const g = ctx.createLinearGradient(0, 0, size, size);
      g.addColorStop(0, "red");
      g.addColorStop(1, "blue");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    return c.convertToBlob({ type, quality: 0.85 });
  };

  for (const type of ["image/png", "image/jpeg", "image/webp"])
    for (const size of [256, 1024, 4096]) {
      const blob = await make(size, type, type === "image/jpeg");
      for (const mode of ["main", "worker"])
        for (let repeat = 0; repeat < 5; repeat++) {
          probe.reset();
          const item = await probe.importBlob(blob, mode);
          timings.push({ type, size, mode, repeat, ...item });
        }
    }
  console.log("decode timing matrix complete");
  console.log("recovery checks complete");
  for (const mode of ["main", "worker"]) {
    probe.reset();
    const imported = await probe.importBlob(
      new Blob([new Uint8Array(hidden)], { type: "image/png" }),
      mode,
    );
    for (const background of ["black", "white", "transparent"])
      for (const angle of [0, 0.37]) {
        const scale = 2.35,
          c = Math.cos(angle) * scale,
          s = Math.sin(angle) * scale,
          image = {
            kind: "image",
            id: imported.id,
            transform: [c, s, -s, c, 100.25, 80.75],
            opacity: 0.7,
          };
        for (const ink of [false, true]) {
          const items = ink
            ? [
                {
                  kind: "ink",
                  from: [20, 130],
                  to: [360, 130],
                  radius: 18,
                  color: [0, 1, 0],
                  opacity: 0.6,
                },
                image,
                {
                  kind: "ink",
                  from: [150, 20],
                  to: [150, 340],
                  radius: 12,
                  color: [1, 0, 1],
                  opacity: 0.5,
                },
              ]
            : [image];
          const rendered = probe.render(items, { width: 400, height: 400, background });
          let interiorMax = 0,
            blueHalo = 0,
            edgeMax = 0;
          if (!ink)
            for (let y = 0; y < 400; y++)
              for (let x = 0; x < 400; x++) {
                const dx = x + 0.5 - 100.25,
                  dy = y + 0.5 - 80.75,
                  lx = (c * dx + s * dy) / (scale * scale),
                  ly = (-s * dx + c * dy) / (scale * scale),
                  i = (y * 400 + x) * 4;
                const edge =
                  Math.min(
                    Math.abs(lx),
                    Math.abs(lx - 32),
                    Math.abs(lx - 64),
                    Math.abs(ly),
                    Math.abs(ly - 64),
                  ) *
                    scale <
                  2;
                for (let ch = 0; ch < 4; ch++) {
                  const error = Math.abs(
                    rendered.pixels[i + ch] - rendered.referencePixels[i + ch],
                  );
                  if (edge) edgeMax = Math.max(edgeMax, error);
                  else interiorMax = Math.max(interiorMax, error);
                }
                if (background === "black") blueHalo = Math.max(blueHalo, rendered.pixels[i + 2]);
              }
          if (mode === "main" && background === "white" && angle !== 0) {
            const strip = new OffscreenCanvas(1200, 400),
              ctx = strip.getContext("2d"),
              diff = new Uint8ClampedArray(rendered.pixels.length);
            for (let i = 0; i < diff.length; i += 4) {
              for (let ch = 0; ch < 3; ch++)
                diff[i + ch] = Math.min(
                  255,
                  Math.abs(rendered.pixels[i + ch] - rendered.referencePixels[i + ch]) * 8,
                );
              diff[i + 3] = 255;
            }
            ctx.putImageData(new ImageData(rendered.pixels, 400, 400), 0, 0);
            ctx.putImageData(new ImageData(rendered.referencePixels, 400, 400), 400, 0);
            ctx.putImageData(new ImageData(diff, 400, 400), 800, 0);
            artifacts.push({
              name: ink ? "ink-image-order" : "image-hidden-rgb",
              bytes: Array.from(new Uint8Array(await (await strip.convertToBlob()).arrayBuffer())),
            });
          }
          matrix.push({
            mode,
            background,
            angle,
            ink,
            diff: rendered.diff,
            interiorMax,
            edgeMax,
            blueHalo,
            samples: rendered.samples,
          });
        }
      }
  }
  probe.reset();
  return {
    checks,
    timings,
    matrix,
    artifacts,
    userAgent: navigator.userAgent,
    dpr: devicePixelRatio,
  };
}, Array.from(hiddenRgbPng()));
results.checks = await page.evaluate(recovery);
for (const artifact of results.artifacts)
  await writeFile(`${out}/${artifact.name}.png`, Buffer.from(artifact.bytes));
delete results.artifacts;
await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
assert.equal(results.timings.length, 90);
assert.equal(results.matrix.length, 24);
assert(results.matrix.every((x) => x.diff.mean < 1));
assert(results.matrix.filter((x) => !x.ink).every((x) => x.interiorMax <= 1 && x.blueHalo === 0));
console.log(
  JSON.stringify({
    checks: results.checks,
    matrix: results.matrix,
    timingRuns: results.timings.length,
  }),
);
clearTimeout(timeout);
await browser.close();
