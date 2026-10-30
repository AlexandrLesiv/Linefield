import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const out = process.env.LINEFIELD_IMAGE_OUT || "../../.build-cache/img01/mipmap-timing";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  page = await browser.newPage({ deviceScaleFactor: 2 });
await page.goto(process.env.LINEFIELD_IMAGE_URL || "http://127.0.0.1:65412/");
await page.waitForFunction(() => window.imageProbe);
const result = await page.evaluate(async () => {
  const probe = window.imageProbe,
    rows = [];
  for (const size of [1024, 4096])
    for (const type of ["image/png", "image/jpeg"]) {
      const canvas = new OffscreenCanvas(size, size),
        ctx = canvas.getContext("2d"),
        gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, "red");
      gradient.addColorStop(1, "blue");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      const blob = await canvas.convertToBlob({ type, quality: 0.85 });
      for (let repeat = 0; repeat < 5; repeat++)
        for (const sampling of repeat % 2 ? ["mipmap", "linear"] : ["linear", "mipmap"]) {
          probe.reset();
          const imported = await probe.importBlob(blob, "worker", sampling);
          const start = performance.now();
          probe.present(
            [{ kind: "image", id: imported.id, transform: [0.125, 0, 0, 0.125, 0, 0], opacity: 1 }],
            { width: 512, height: 512, background: "white" },
          );
          rows.push({
            size,
            type,
            repeat,
            sampling,
            ...imported,
            drawSubmissionMs: performance.now() - start,
          });
        }
    }
  probe.reset();
  return { rows, userAgent: navigator.userAgent };
});
await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ runs: result.rows.length }));
await browser.close();
