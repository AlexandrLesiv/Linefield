import { hiddenRgbPng } from "./image-import-png.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.LINEFIELD_IMAGE_OUT || "../../.build-cache/img01/minify";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(process.env.LINEFIELD_IMAGE_URL || "http://127.0.0.1:65409/");
await page.waitForFunction(() => window.imageProbe);
const result = await page.evaluate(
  async ({ sampling, hidden }) => {
    const probe = window.imageProbe,
      rows = [],
      artifacts = [];
    for (const pattern of ["checker", "gradient"]) {
      const source = new OffscreenCanvas(512, 512),
        ctx = source.getContext("2d"),
        data = ctx.createImageData(512, 512);
      for (let y = 0; y < 512; y++)
        for (let x = 0; x < 512; x++) {
          const i = (y * 512 + x) * 4,
            value = pattern === "checker" ? ((x + y) % 2) * 255 : x / 2;
          data.data.set([value, value, value, 255], i);
        }
      ctx.putImageData(data, 0, 0);
      const blob = await source.convertToBlob({ type: "image/png" });
      for (const mode of ["main", "worker"]) {
        probe.reset();
        const image = await probe.importBlob(blob, mode, sampling);
        for (const scale of [0.125, 0.3, 1, 2.35])
          for (const angle of [0, 0.37]) {
            const c = Math.cos(angle) * scale,
              s = Math.sin(angle) * scale,
              rendered = probe.render(
                [
                  {
                    kind: "image",
                    id: image.id,
                    transform: [c, s, -s, c, 180.25, 80.75],
                    opacity: 1,
                  },
                ],
                { width: 512, height: 512, background: "white" },
              );
            let interiorMax = 0,
              interiorSum = 0,
              count = 0;
            for (let y = 0; y < 512; y++)
              for (let x = 0; x < 512; x++) {
                const dx = x + 0.5 - 180.25,
                  dy = y + 0.5 - 80.75,
                  lx = (c * dx + s * dy) / (scale * scale),
                  ly = (-s * dx + c * dy) / (scale * scale);
                if (Math.min(lx, ly, 512 - lx, 512 - ly) * scale > 2) {
                  const i = (y * 512 + x) * 4,
                    error = Math.abs(rendered.pixels[i] - rendered.referencePixels[i]);
                  interiorMax = Math.max(interiorMax, error);
                  interiorSum += error;
                  count++;
                }
              }
            rows.push({
              pattern,
              mode,
              scale,
              angle,
              diff: rendered.diff,
              interiorMax,
              interiorMean: count ? interiorSum / count : 0,
            });
            if (mode === "worker" && scale === 0.125 && angle !== 0) {
              const strip = new OffscreenCanvas(1024, 512),
                context = strip.getContext("2d");
              context.putImageData(new ImageData(rendered.pixels, 512, 512), 0, 0);
              context.putImageData(new ImageData(rendered.referencePixels, 512, 512), 512, 0);
              artifacts.push({
                name: pattern,
                bytes: Array.from(
                  new Uint8Array(await (await strip.convertToBlob()).arrayBuffer()),
                ),
              });
            }
          }
      }
    }
    for (const mode of ["main", "worker"]) {
      probe.reset();
      const image = await probe.importBlob(
        new Blob([new Uint8Array(hidden)], { type: "image/png" }),
        mode,
        sampling,
      );
      for (const scale of [0.125, 0.3])
        for (const angle of [0, 0.37]) {
          const c = Math.cos(angle) * scale,
            s = Math.sin(angle) * scale,
            r = probe.render(
              [
                {
                  kind: "image",
                  id: image.id,
                  transform: [c, s, -s, c, 40.25, 30.75],
                  opacity: 0.7,
                },
              ],
              { width: 100, height: 100, background: "black" },
            );
          let blueHalo = 0;
          for (let i = 2; i < r.pixels.length; i += 4) blueHalo = Math.max(blueHalo, r.pixels[i]);
          rows.push({ pattern: "hidden-rgb", mode, scale, angle, diff: r.diff, blueHalo });
        }
    }
    probe.reset();
    return { rows, artifacts };
  },
  {
    sampling: process.env.LINEFIELD_IMAGE_SAMPLING || "linear",
    hidden: Array.from(hiddenRgbPng()),
  },
);
for (const a of result.artifacts) await writeFile(`${out}/${a.name}.png`, Buffer.from(a.bytes));
delete result.artifacts;
await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
await browser.close();
