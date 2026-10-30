import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL,
  out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/text01/zoom";
if (!url) throw Error("Isolated preview required");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  const page = await browser.newPage({
      viewport: { width: 1100, height: 850 },
      deviceScaleFactor: 2,
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#text-tool").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#paper-style").selectOption("none");
  await frame.locator("#grid-style").selectOption("none");
  await page.keyboard.press("Escape");
  await frame.locator("#text-tool").click();
  await frame.evaluate(() => {
    document.querySelector("#color").value = "#16385c";
    document.querySelector("#opacity").value = "40";
  });
  await frame.locator("canvas").click({ position: { x: 500, y: 350 } });
  await frame.locator("#text-input").fill(("HHHHHHHHH OOOOOOO iiié ".repeat(8) + "\n").repeat(3));
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden" });
  await frame.locator("#pen").click();
  await frame.addStyleTag({
    content: "main > aside {visibility:hidden!important;} canvas {outline:none!important;}",
  });
  const canvas = frame.locator("canvas").first(),
    box = await canvas.boundingBox();
  const capture = async (name) => {
    const started = Date.now();
    await frame.waitForFunction(
      () => lab.textStatus().queued === 0 && !lab.textStatus().error && !lab.renderPending(),
      null,
      { timeout: 30000 },
    );
    const png = await canvas.screenshot();
    await writeFile(`${out}/${name}.png`, png);
    const result = await frame.evaluate(async (encoded) => {
      const c = lab.core,
        origin = lab.viewOrigin();
      c.text_read(0x40000000, BigInt(origin[0]), 0, BigInt(origin[1]), 0);
      const v = Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)),
        text = new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.text_content_ptr(0x40000000), v[17]),
        ),
        view = lab.view(),
        source = document.querySelector("canvas"),
        w = source.width,
        h = source.height,
        dpr = devicePixelRatio;
      const a = new OffscreenCanvas(w, h),
        b = new OffscreenCanvas(w, h),
        ca = a.getContext("2d"),
        cb = b.getContext("2d"),
        image = new Image();
      image.src = `data:image/png;base64,${encoded}`;
      await image.decode();
      ca.drawImage(image, 0, 0);
      cb.fillStyle = "white";
      cb.fillRect(0, 0, w, h);
      cb.translate(view.cx * dpr, view.cy * dpr);
      cb.rotate(view.rotation);
      cb.scale(view.zoom * dpr, view.zoom * dpr);
      cb.transform(v[11], v[12], -v[12], v[11], v[9], v[10]);
      cb.font = '32px "LinefieldTextV1", sans-serif';
      cb.textBaseline = "alphabetic";
      cb.fillStyle = "#" + v[5].toString(16).padStart(6, "0");
      cb.globalAlpha = v[6];
      text.split("\n").forEach((line, i) => cb.fillText(line, v[18], v[19] + 40 * i));
      const native = cb.getImageData(0, 0, w, h).data;
      const density =
        2 ** (Math.ceil(Math.log2(view.zoom * Math.hypot(v[11], v[12]) * dpr) * 4) / 4);
      const raster = new OffscreenCanvas(
          Math.ceil(v[13] * density) + 4,
          Math.ceil(v[14] * density) + 4,
        ),
        rc = raster.getContext("2d");
      rc.scale(density, density);
      rc.translate(2 / density, 2 / density);
      rc.font = '32px "LinefieldTextV1", sans-serif';
      rc.textBaseline = "alphabetic";
      rc.fillStyle = "#" + v[5].toString(16).padStart(6, "0");
      text.split("\n").forEach((line, i) => rc.fillText(line, v[18], v[19] + 40 * i));
      cb.resetTransform();
      cb.globalAlpha = 1;
      cb.fillStyle = "white";
      cb.fillRect(0, 0, w, h);
      cb.translate(view.cx * dpr, view.cy * dpr);
      cb.rotate(view.rotation);
      cb.scale(view.zoom * dpr, view.zoom * dpr);
      cb.transform(v[11], v[12], -v[12], v[11], v[9], v[10]);
      cb.globalAlpha = v[6];
      cb.drawImage(
        raster,
        -2 / density,
        -2 / density,
        raster.width / density,
        raster.height / density,
      );
      const aa = ca.getImageData(0, 0, w, h).data,
        bb = cb.getImageData(0, 0, w, h).data;
      let nativeSum = 0,
        nativeMax = 0,
        sum = 0,
        max = 0,
        holes = 0,
        interior = 0,
        interiorMax = 0;
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4;
          for (let k = 0; k < 3; k++) {
            const nd = Math.abs(aa[i + k] - native[i + k]);
            nativeSum += nd;
            nativeMax = Math.max(nativeMax, nd);
            const delta = Math.abs(aa[i + k] - bb[i + k]);
            sum += delta;
            max = Math.max(max, delta);
          }
          if (bb[i] < 230 && aa[i] > 250) holes++;
          if (
            bb[i] === bb[i - 4] &&
            bb[i] === bb[i + 4] &&
            bb[i] === bb[i - w * 4] &&
            bb[i] === bb[i + w * 4] &&
            bb[i] < 230
          ) {
            interior++;
            interiorMax = Math.max(interiorMax, Math.abs(aa[i] - bb[i]));
          }
        }
      return {
        view,
        status: lab.textStatus(),
        sum,
        max,
        holes,
        interior,
        interiorMax,
        mean: sum / (w * h * 3),
        nativeMean: nativeSum / (w * h * 3),
        nativeMax,
        density,
      };
    }, png.toString("base64"));
    result.name = name;
    result.readyMs = Date.now() - started;
    results.push(result);
    await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
    assert.equal(result.status.error, "");
    assert.ok(result.interior > 100, "visible text present");
    assert.ok(result.max <= 2 && result.holes === 0, "no tile cracks or doubled opacity");
  };
  await capture("native-wide-translucent");
  await page.mouse.move(box.x + 500, box.y + 350);
  await page.mouse.wheel(0, -1200);
  await capture("zoomed-tiles");
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  await page.keyboard.down("r");
  await page.mouse.move(cx + 150, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 130, cy + 75, { steps: 15 });
  await page.mouse.up();
  await page.keyboard.up("r");
  await capture("rotated-tiles");
  await page.keyboard.down("Space");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx - 350, cy + 80, { steps: 30 });
  const beforeRelease = Date.now();
  await frame.waitForFunction(
    () => lab.textStatus().queued === 0 && !lab.textStatus().error,
    null,
    { timeout: 10000 },
  );
  results.push({
    name: "exact-tiles-ready-before-pan-release",
    waitMs: Date.now() - beforeRelease,
    status: await frame.evaluate(() => lab.textStatus()),
  });
  await page.mouse.up();
  await page.keyboard.up("Space");
  await capture("panned-tiles");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
