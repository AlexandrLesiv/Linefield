import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
const url = process.env.LINEFIELD_SVG_URL;
if (!url) throw Error("Isolated SVG fixture required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  const page = await browser.newPage();
  await page.goto(url);
  await page.waitForFunction(() => !!window.svgProbe);
  const environment = await page.evaluate(() => {
    const gl = document.createElement("canvas").getContext("webgl2"),
      ext = gl?.getExtension("WEBGL_debug_renderer_info");
    const info = gl
      ? {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          unmaskedVendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
          unmaskedRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
        }
      : null;
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    return info;
  });
  const run = () =>
    page.evaluate(async () => {
      const g = svgProbe.capsuleGroup(1, 0, [20, 30, 12, 100, 80, 18], 0x345678, 0.7, 36);
      try {
        const result = await svgProbe.job(
          [g],
          { x: 0, y: 0, width: 128, height: 128, density: 2 },
          "whole",
        );
        return { svg: result.svg };
      } catch (error) {
        return { error: String(error) };
      }
    });
  const baseline = await run();
  assert.ok(baseline.svg);
  for (const phase of ["draw", "before-readback", "after-readback"]) {
    const created = page.waitForEvent("worker");
    await page.evaluate(() => svgProbe.reset());
    const worker = await created;
    await worker.evaluate((stage) => {
      const originalContext = OffscreenCanvas.prototype.getContext;
      self.lossGl = null;
      self.lossInjected = false;
      const lose = () => {
        if (!self.lossInjected && self.lossGl) {
          self.lossInjected = true;
          self.lossGl.getExtension("WEBGL_lose_context").loseContext();
        }
      };
      OffscreenCanvas.prototype.getContext = function (type, ...args) {
        const context = originalContext.call(this, type, ...args);
        if (type === "webgl2" && context) {
          self.lossGl = context;
          if (stage === "draw") {
            const draw = context.drawArraysInstanced.bind(context);
            context.drawArraysInstanced = (...values) => {
              draw(...values);
              lose();
            };
          }
        }
        return context;
      };
      if (stage === "before-readback") {
        const draw = OffscreenCanvasRenderingContext2D.prototype.drawImage;
        OffscreenCanvasRenderingContext2D.prototype.drawImage = function (...args) {
          lose();
          return draw.apply(this, args);
        };
      }
      if (stage === "after-readback") {
        const encode = OffscreenCanvas.prototype.convertToBlob;
        OffscreenCanvas.prototype.convertToBlob = async function (...args) {
          const blob = await encode.apply(this, args);
          lose();
          return blob;
        };
      }
    }, phase);
    const result = await run(),
      injected = await worker.evaluate(() => self.lossInjected);
    assert.equal(injected, true, "real WEBGL_lose_context injection executed");
    const accepted = result.svg !== undefined,
      exact = result.svg === baseline.svg;
    const pixels =
      accepted && !exact
        ? await page.evaluate(
            async ({ a, b }) => {
              async function decode(svg) {
                const image = new Image(),
                  imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
                try {
                  image.src = imageUrl;
                  await image.decode();
                  const c = document.createElement("canvas");
                  c.width = c.height = 256;
                  const ctx = c.getContext("2d");
                  ctx.drawImage(image, 0, 0);
                  return ctx.getImageData(0, 0, 256, 256).data;
                } finally {
                  URL.revokeObjectURL(imageUrl);
                }
              }
              const x = await decode(a),
                y = await decode(b);
              let changed = 0,
                baselineCovered = 0,
                covered = 0;
              for (let i = 3; i < x.length; i += 4) {
                baselineCovered += Number(x[i] > 0);
                covered += Number(y[i] > 0);
                if (x[i] !== y[i]) changed++;
              }
              return { changed, baselineCovered, covered };
            },
            { a: baseline.svg, b: result.svg },
          )
        : undefined;
    results.push({ phase, accepted, exact, error: result.error, pixels });
    const immediateRecovery = await run();
    assert.equal(
      immediateRecovery.svg,
      baseline.svg,
      "fresh backend recovers without resetting worker",
    );
    const restored = page.waitForEvent("worker");
    await page.evaluate(() => svgProbe.reset());
    await restored;
    const recovery = await run();
    assert.equal(recovery.svg, baseline.svg, "worker reset restores exact export");
  }
  writeFileSync(
    ".build-cache/svg01/context-loss-results.json",
    JSON.stringify({ environment, results }, null, 2),
  );
  console.log(JSON.stringify({ environment, results }));
  assert.ok(
    results.every((r) => !r.accepted || r.exact),
    "context loss must not succeed with partial/blank artwork",
  );
} finally {
  await browser.close();
}
