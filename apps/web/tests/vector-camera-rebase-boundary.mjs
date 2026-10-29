import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/rebase-boundary";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.LINEFIELD_PREVIEW_URL);
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#brush").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const result = await frame.evaluate(() => {
    const c = lab.core,
      max = (1n << 63n) - 1n,
      min = -(1n << 63n);
    const rows = [];
    const snapshot = () => ({
      region: String(c.camera_origin_region(0)),
      output: Array.from(new Float64Array(c.memory.buffer, c.camera_output_ptr(), 3)),
    });
    for (const [region, x, expected] of [
      [0n, 300000, 5n],
      [0n, -300000, -5n],
      [0n, 294912, 5n],
      [0n, -294912, -4n],
      [max - 5n, 367680, max],
      [min + 5n, -327680, min],
    ]) {
      if (!c.camera_rebase(region, 0n, -x, 0, 1, 0)) throw Error("Valid rebase rejected");
      const actual = snapshot(),
        shift = Number(expected - region) * 65536;
      if (
        actual.region !== String(expected) ||
        actual.output[0] !== -x + shift ||
        actual.output[1] !== 0 ||
        actual.output[2] !== 1
      )
        throw Error("Wrong nearest regional projection");
      rows.push({ region: String(region), x, ...actual });
    }
    const previous = JSON.stringify(snapshot());
    for (const [region, x] of [
      [max, 300000],
      [min, -300000],
      [0n, Infinity],
      [0n, NaN],
    ]) {
      if (c.camera_rebase(region, 0n, -x, 0, 1, 0) || JSON.stringify(snapshot()) !== previous)
        throw Error("Invalid rebase mutated published state");
    }
    return { rows, atomicRejections: 4 };
  });
  await writeFile(`${output}/results.json`, JSON.stringify(result, null, 2));
  console.log(
    "PASS nearest-region ties, signed-i64 edges and atomic invalid-rebase rejection through application Wasm",
  );
} finally {
  await browser.close();
}
