import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

/** Browser-generated fixture only: no user assets or external JPEG encoder. */
export async function orientationCheck() {
  const canvas = new OffscreenCanvas(96, 64),
    context = canvas.getContext("2d");
  for (const [color, x, y] of [
    ["#e21d32", 0, 0],
    ["#13bc4e", 48, 0],
    ["#254be7", 0, 32],
    ["#efca12", 48, 32],
  ]) {
    context.fillStyle = color;
    context.fillRect(x, y, 48, 32);
  }
  context.fillStyle = "#202020";
  context.fillRect(5, 7, 11, 9);
  const original = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.92 });
  const jpeg = new Uint8Array(await original.arrayBuffer());
  if (jpeg[0] !== 255 || jpeg[1] !== 216) throw Error("JPEG encoder unavailable");
  const pixels = async (blob) => {
    const bitmap = await createImageBitmap(blob);
    try {
      const target = new OffscreenCanvas(bitmap.width, bitmap.height),
        ctx = target.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0);
      return {
        width: bitmap.width,
        height: bitmap.height,
        rgba: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data,
      };
    } finally {
      bitmap.close();
    }
  };
  const baseline = await pixels(original);
  const workerCode = `const pixels=${pixels.toString()};onmessage=async({data})=>{try{const value=await pixels(data);postMessage(value,[value.rgba.buffer]);}catch(e){postMessage({error:String(e)});}}`;
  const url = URL.createObjectURL(new Blob([workerCode], { type: "text/javascript" })),
    worker = new Worker(url);
  const decodeWorker = (blob) =>
    new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => (data.error ? reject(Error(data.error)) : resolve(data));
      worker.onerror = () => reject(Error("orientation worker failed"));
      worker.postMessage(blob);
    });
  const cases = [];
  try {
    for (let orientation = 1; orientation <= 8; orientation++) {
      // APP1 Exif, big-endian TIFF, one SHORT orientation entry, no next IFD.
      const segment = new Uint8Array([
        255,
        225,
        0,
        34,
        69,
        120,
        105,
        102,
        0,
        0,
        77,
        77,
        0,
        42,
        0,
        0,
        0,
        8,
        0,
        1,
        1,
        18,
        0,
        3,
        0,
        0,
        0,
        1,
        0,
        orientation,
        0,
        0,
        0,
        0,
        0,
        0,
      ]);
      const blob = new Blob([jpeg.subarray(0, 2), segment, jpeg.subarray(2)], {
        type: "image/jpeg",
      });
      const width = orientation >= 5 ? baseline.height : baseline.width,
        height = orientation >= 5 ? baseline.width : baseline.height,
        expected = new Uint8ClampedArray(width * height * 4);
      for (let y = 0; y < baseline.height; y++) {
        for (let x = 0; x < baseline.width; x++) {
          const w = baseline.width - 1,
            h = baseline.height - 1;
          const [u, v] = [
            [x, y],
            [w - x, y],
            [w - x, h - y],
            [x, h - y],
            [y, x],
            [h - y, x],
            [h - y, w - x],
            [y, w - x],
          ][orientation - 1];
          expected.set(
            baseline.rgba.subarray((y * baseline.width + x) * 4, (y * baseline.width + x) * 4 + 4),
            (v * width + u) * 4,
          );
        }
      }
      for (const mode of [
        "main",
        "worker",
        ...(window.imageProbe ? ["fixture-main", "fixture-worker"] : []),
      ]) {
        let actual;
        if (mode.startsWith("fixture-")) {
          const asset = await imageProbe.importBlob(blob, mode.slice(8));
          const value = await imageProbe.pixels(asset.id);
          actual = { width: value.width, height: value.height, rgba: value.pixels };
          imageProbe.reset();
        } else actual = await (mode === "main" ? pixels(blob) : decodeWorker(blob));
        let changed = 0,
          max = 0;
        if (actual.width === width && actual.height === height) {
          for (let i = 0; i < expected.length; i++) {
            const delta = Math.abs(expected[i] - actual.rgba[i]);
            if (delta) changed++;
            max = Math.max(max, delta);
          }
        } else changed = expected.length;
        cases.push({
          orientation,
          mode,
          width: actual.width,
          height: actual.height,
          expectedWidth: width,
          expectedHeight: height,
          changedChannels: changed,
          max,
        });
      }
    }
  } finally {
    worker.terminate();
    URL.revokeObjectURL(url);
  }
  return {
    cases,
    environment: { userAgent: navigator.userAgent, devicePixelRatio },
    source: "synthetic canvas JPEG; unchanged compressed pixels with EXIF tags1–8",
    reference: "manual pixel permutation of independently decoded orientation-free JPEG",
    scope: "Default browser and isolated fixture decode orientation; no product integration",
  };
}

if (
  process.env.LINEFIELD_IMAGE_URL &&
  import.meta.url === pathToFileURL(process.argv[1] ?? "").href
) {
  const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/img01/orientation";
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage();
    await page.goto(process.env.LINEFIELD_IMAGE_URL);
    await page.waitForFunction(() => !!window.imageProbe);
    const result = await page.evaluate(orientationCheck);
    await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
    assert.equal(result.cases.length, 32);
    for (const item of result.cases) {
      assert.equal(item.width, item.expectedWidth);
      assert.equal(item.height, item.expectedHeight);
      assert.equal(item.changedChannels, 0, `EXIF${item.orientation} ${item.mode}`);
    }
    console.log(JSON.stringify(result));
  } finally {
    await browser.close();
  }
}
