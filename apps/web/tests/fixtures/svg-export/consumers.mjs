import { chromium, webkit } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg01/consumers";
await mkdir(output, { recursive: true });
const producer = await chromium.launch({ channel: "chrome", headless: true });
let artifacts;
try {
  const page = await producer.newPage();
  await page.goto(process.env.LINEFIELD_SVG_URL ?? "http://127.0.0.1:65385");
  await page.waitForFunction(() => !!window.svgProbe);
  artifacts = await page.evaluate(
    async ({ mode, flattened, dense }) => {
      const { instance } = await WebAssembly.instantiate(
          await (await fetch("/core.wasm")).arrayBuffer(),
          {},
        ),
        core = instance.exports;
      for (const brush of [0, 1, 2]) {
        core.begin_with_style(
          36,
          dense ? [0x884422, 0x225588, 0x338844][brush] : 0x335566,
          0.1,
          1,
          0.6,
        );
        core.set_active_brush(brush);
        for (let i = 0; i < 100; i++)
          core.push_precise(
            10 + i * 1.7,
            dense
              ? 80 + brush * 5 + Math.sin(i / 4 + brush) * 30
              : 30 + brush * 55 + Math.sin(i / 4) * 22,
            0.5,
          );
        core.commit();
      }
      const snapshot = await svgProbe.capture(core, 0.05),
        view = { x: 0.25, y: 0.125, width: 192, height: 192, density: 2 };
      const tiled = await svgProbe.job(snapshot.groups, view, mode, 128, 4),
        untiled = await svgProbe.job(snapshot.groups, view, "raster", 1024, 4);
      if (flattened) {
        const reference = await svgProbe.job(snapshot.groups, view, "reference");
        const bytes = new Uint8Array(reference.bytes);
        let binary = "";
        for (let i = 0; i < bytes.length; i += 16384)
          binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
        untiled.svg = `<svg xmlns="http://www.w3.org/2000/svg" width="384" height="384"><image width="384" height="384" href="data:image/png;base64,${btoa(binary)}"/></svg>`;
      }
      return { tiled: tiled.svg, untiled: untiled.svg };
    },
    {
      mode: process.env.LINEFIELD_SVG_MODE ?? "raster",
      flattened: process.env.LINEFIELD_SVG_REFERENCE === "flattened",
      dense: process.env.LINEFIELD_SVG_DENSE === "1",
    },
  );
} finally {
  await producer.close();
}
for (const [name, svg] of Object.entries(artifacts)) await writeFile(`${output}/${name}.svg`, svg);
const results = [];
for (const [name, engine, options] of [
  ["Chrome", chromium, { channel: "chrome" }],
  ["Playwright-WebKit", webkit, {}],
]) {
  const browser = await engine.launch({ headless: true, ...options });
  try {
    const page = await browser.newPage();
    await page.setContent("<title>Independent SVG consumer</title>");
    for (const scale of [1, 0.73, 1.31])
      for (const matte of ["white", "black"]) {
        const row = await page.evaluate(
          async ({ artifacts: artifactsInput, scale: scaleInput, matte: matteInput }) => {
            const render = async (svg) => {
              const image = new Image();
              image.src = "data:image/svg+xml;base64," + btoa(svg);
              await image.decode();
              const canvas = document.createElement("canvas");
              canvas.width = canvas.height = 640;
              const ctx = canvas.getContext("2d");
              ctx.fillStyle = matteInput;
              ctx.fillRect(0, 0, 640, 640);
              ctx.translate(120.25, 70.125);
              ctx.rotate(scaleInput === 1 ? 0 : 0.17);
              ctx.scale(scaleInput, scaleInput);
              ctx.drawImage(image, 0, 0);
              return { pixels: ctx.getImageData(0, 0, 640, 640).data, png: canvas.toDataURL() };
            };
            const a = await render(artifactsInput.untiled),
              b = await render(artifactsInput.tiled);
            let changed = 0,
              max = 0,
              sum = 0;
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 640;
            const ctx = canvas.getContext("2d"),
              diff = ctx.createImageData(640, 640);
            for (let p = 0; p < 640 * 640; p++) {
              let any = false;
              for (let c = 0; c < 4; c++) {
                const d = Math.abs(a.pixels[p * 4 + c] - b.pixels[p * 4 + c]);
                max = Math.max(max, d);
                sum += d;
                any ||= d > 0;
                diff.data[p * 4 + c] = c === 3 ? 255 : d;
              }
              if (any) changed++;
            }
            ctx.putImageData(diff, 0, 0);
            return {
              changed,
              max,
              mean: sum / (640 * 640 * 4),
              reference: a.png,
              candidate: b.png,
              difference: canvas.toDataURL(),
            };
          },
          { artifacts, scale, matte },
        );
        for (const key of ["reference", "candidate", "difference"]) {
          await writeFile(
            `${output}/${name}-${scale}-${matte}-${key}.png`,
            Buffer.from(row[key].split(",")[1], "base64"),
          );
          delete row[key];
        }
        results.push({ consumer: name, scale, rotation: scale === 1 ? 0 : 0.17, matte, ...row });
      }
  } finally {
    await browser.close();
  }
}
await writeFile(output + "/results.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
