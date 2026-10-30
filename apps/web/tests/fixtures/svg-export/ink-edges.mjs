import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = ".build-cache/svg01/ink-edges";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://127.0.0.1:65389");
  await page.waitForFunction(() => !!window.svgProbe);
  const rows = [];
  for (const density of [1, 2, 4]) {
    const row = await page.evaluate(async (scale) => {
      const { instance } = await WebAssembly.instantiate(
        await (await fetch("/core.wasm")).arrayBuffer(),
        {},
      );
      const core = instance.exports;
      core.begin_with_style(24, 0x224466, 0.1, 1, 0.6);
      core.set_active_brush(0);
      for (let i = 0; i < 100; i++)
        core.push_precise(
          96 + Math.sin(i / 12) * 60,
          96 + Math.sin(i / 6) * 45,
          0.2 + (i % 8) / 10,
        );
      core.commit();
      const snapshot = await svgProbe.capture(core, 0.025);
      const view = { x: 0.25, y: 0.125, width: 192, height: 192, density: scale };
      const reference = await svgProbe.job(snapshot.groups, view, "reference");
      const candidate = await svgProbe.job(snapshot.groups, view, "hybrid");
      const size = 192 * scale;
      const decode = async (blob) => {
        const image = await createImageBitmap(blob),
          canvas = document.createElement("canvas");
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0);
        image.close();
        return { canvas, ctx, pixels: ctx.getImageData(0, 0, size, size).data };
      };
      const a = await decode(new Blob([reference.bytes], { type: "image/png" }));
      const svgImage = new Image();
      svgImage.src = URL.createObjectURL(new Blob([candidate.svg], { type: "image/svg+xml" }));
      await svgImage.decode();
      const b = await decode(
        await (async () => {
          const c = new OffscreenCanvas(size, size);
          c.getContext("2d").drawImage(svgImage, 0, 0);
          return c.convertToBlob();
        })(),
      );
      const aa = new Uint8Array(size * size);
      for (let p = 0; p < aa.length; p++)
        if (a.pixels[p * 4 + 3] > 0 && a.pixels[p * 4 + 3] < 153) aa[p] = 1;
      let changed = 0,
        max = 0,
        above2 = 0,
        above2OutsideEdge = 0;
      const diff = a.ctx.createImageData(size, size);
      for (let p = 0; p < aa.length; p++) {
        let delta = 0;
        for (let c = 0; c < 3; c++) {
          const left = Math.round(
            (a.pixels[p * 4 + c] * a.pixels[p * 4 + 3]) / 255 + 255 - a.pixels[p * 4 + 3],
          );
          const right = Math.round(
            (b.pixels[p * 4 + c] * b.pixels[p * 4 + 3]) / 255 + 255 - b.pixels[p * 4 + 3],
          );
          delta = Math.max(delta, Math.abs(left - right));
          diff.data[p * 4 + c] = Math.min(255, Math.abs(left - right) * 8);
        }
        diff.data[p * 4 + 3] = 255;
        if (delta) changed++;
        max = Math.max(max, delta);
        if (delta > 2) {
          above2++;
          const x = p % size,
            y = Math.floor(p / size);
          let near = false;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++)
              if (x + dx >= 0 && x + dx < size && y + dy >= 0 && y + dy < size)
                near ||= !!aa[(y + dy) * size + x + dx];
          if (!near) above2OutsideEdge++;
        }
      }
      const visual = document.createElement("canvas");
      visual.width = size * 3;
      visual.height = size + 42;
      const ctx = visual.getContext("2d");
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, visual.width, visual.height);
      ctx.fillStyle = "black";
      ctx.font = "12px sans-serif";
      ctx.fillText(`Shader reference · density ${scale}`, 8, 24);
      ctx.fillText("Vector SVG · self-overlap", size + 8, 24);
      ctx.fillText("Absolute difference ×8 (clipped)", size * 2 + 8, 24);
      ctx.drawImage(a.canvas, 0, 42);
      ctx.drawImage(b.canvas, size, 42);
      a.ctx.putImageData(diff, 0, 0);
      ctx.drawImage(a.canvas, size * 2, 42);
      return {
        density: scale,
        changed,
        max,
        above2,
        above2OutsideEdge,
        edgeDefinition: "Reference alpha 1..152, dilated one physical pixel; opacity quantized153",
        raw: core.raw_length(0),
        svg: candidate.svg,
        visual: visual.toDataURL(),
      };
    }, density);
    await writeFile(`${output}/ink-${density}.svg`, row.svg);
    await writeFile(
      `${output}/ink-${density}.png`,
      Buffer.from(row.visual.split(",")[1], "base64"),
    );
    delete row.svg;
    delete row.visual;
    rows.push(row);
  }
  await writeFile(output + "/results.json", JSON.stringify(rows, null, 2));
  console.log(JSON.stringify(rows));
} finally {
  await browser.close();
}
