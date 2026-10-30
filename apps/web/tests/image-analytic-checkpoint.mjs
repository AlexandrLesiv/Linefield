import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { hiddenRgbPng } from "./image-import-png.mjs";
const out = "../../.build-cache/img02/analytic-results";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(process.env.LINEFIELD_IMAGE_URL || "http://127.0.0.1:65419/");
await page.waitForFunction(() => window.analyticRender);
const result = await page.evaluate(async (hidden) => {
  const rows = [],
    artifacts = [],
    canvas = new OffscreenCanvas(512, 512),
    ctx = canvas.getContext("2d"),
    data = ctx.createImageData(512, 512);
  for (let y = 0; y < 512; y++)
    for (let x = 0; x < 512; x++) {
      const v = ((x + y) % 2) * 255;
      data.data.set([v, v, v, 255], (y * 512 + x) * 4);
    }
  ctx.putImageData(data, 0, 0);
  const checker = await canvas.convertToBlob({ type: "image/png" });
  for (const pattern of ["checker", "hidden"])
    for (const scale of [0.125, 0.3, 1, 2.35])
      for (const angle of [0, 0.37])
        for (const background of ["white", "black"]) {
          const size = pattern === "checker" ? 512 : 64,
            blob =
              pattern === "checker"
                ? checker
                : new Blob([new Uint8Array(hidden)], { type: "image/png" }),
            a = Math.cos(angle) * scale,
            b = Math.sin(angle) * scale;
          const r = await window.analyticRender(
            blob,
            [a, b, -b, a, 180.25, 80.75],
            pattern === "hidden" ? 0.7 : 1,
            background,
          );
          let max = 0,
            sum = 0,
            interiorMax = 0,
            blueHalo = 0;
          for (let y = 0; y < 512; y++)
            for (let x = 0; x < 512; x++) {
              const dx = x + 0.5 - 180.25,
                dy = y + 0.5 - 80.75,
                lx = (a * dx + b * dy) / (scale * scale),
                ly = (-b * dx + a * dy) / (scale * scale),
                i = (y * 512 + x) * 4,
                near =
                  Math.min(
                    Math.abs(lx),
                    Math.abs(lx - size),
                    Math.abs(ly),
                    Math.abs(ly - size),
                    pattern === "hidden" ? Math.abs(lx - 32) : Infinity,
                  ) *
                    scale <
                  2;
              for (let ch = 0; ch < 4; ch++) {
                const e = Math.abs(r.pixels[i + ch] - r.expected[i + ch]);
                max = Math.max(max, e);
                sum += e;
                if (!near) interiorMax = Math.max(interiorMax, e);
              }
              if (pattern === "hidden" && background === "black")
                blueHalo = Math.max(blueHalo, r.pixels[i + 2]);
            }
          rows.push({
            pattern,
            scale,
            angle,
            background,
            max,
            mean: sum / r.pixels.length,
            interiorMax,
            blueHalo,
          });
          if (scale === 0.3 && angle !== 0 && background === "white") {
            const strip = new OffscreenCanvas(1024, 512),
              c = strip.getContext("2d");
            c.putImageData(new ImageData(r.pixels, 512, 512), 0, 0);
            c.putImageData(new ImageData(r.expected, 512, 512), 512, 0);
            artifacts.push({
              name: pattern,
              bytes: Array.from(new Uint8Array(await (await strip.convertToBlob()).arrayBuffer())),
            });
          }
        }
  return { rows, artifacts };
}, Array.from(hiddenRgbPng()));
for (const a of result.artifacts) await writeFile(`${out}/${a.name}.png`, Buffer.from(a.bytes));
delete result.artifacts;
await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2));
assert(result.rows.every((r) => r.blueHalo === 0 && r.interiorMax <= 2 && r.mean < 0.06));
console.log(JSON.stringify(result));
await browser.close();
