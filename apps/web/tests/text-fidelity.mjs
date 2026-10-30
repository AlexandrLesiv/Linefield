import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL,
  out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/text01/fidelity";
if (!url) throw Error("Isolated preview required");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
      viewport: { width: 1000, height: 800 },
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
    const e = document.querySelector("#opacity");
    e.value = "40";
    e.dispatchEvent(new Event("input"));
  });
  await frame.locator("canvas").click({ position: { x: 450, y: 300 } });
  await frame.locator("#text-input").fill("Héllo Україна\nitalic j g Á\n");
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden" });
  await frame.locator("#pen").click();
  await frame.waitForFunction(
    () => lab.textStatus().queued === 0 && !lab.textStatus().error && !lab.renderPending(),
  );
  const canvas = frame.locator("canvas").first();
  await frame.addStyleTag({ content: "main > aside { visibility: hidden !important; }" });
  const reference = await canvas.screenshot();
  await writeFile(`${out}/editor.png`, reference);
  const svgResult = async () => {
    await frame.locator("#editor-settings-toggle").click();
    await frame.locator("#svg-export-open").click();
    await frame.locator("#svg-export-start").click();
    await frame.waitForFunction(
      () =>
        !document.querySelector("#svg-export-download").hidden ||
        document.querySelector("#svg-export-notice")?.textContent?.includes("failed"),
      null,
      { timeout: 60000 },
    );
    assert.equal(
      await frame.locator("#svg-export-download").isVisible(),
      true,
      await frame.locator("#svg-export-notice").textContent(),
    );
    return frame.evaluate(
      async () => await (await fetch(document.querySelector("#svg-export-download").href)).text(),
    );
  };
  const svg = await svgResult();
  await writeFile(`${out}/text.svg`, svg);
  const result = await frame.evaluate(
    async ({ png, svg: markup }) => {
      const c = lab.core;
      c.text_read(0x40000000, 0n, 0, 0n, 0);
      const v = Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)),
        text = new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.text_content_ptr(0x40000000), v[17]),
        );
      const view = lab.view(),
        source = document.querySelector("canvas"),
        w = source.width,
        h = source.height,
        dpr = devicePixelRatio;
      const load = async (src) => {
        const image = new Image();
        image.src = src;
        await image.decode();
        return image;
      };
      const actual = new OffscreenCanvas(w, h),
        independent = new OffscreenCanvas(w, h),
        exported = new OffscreenCanvas(w, h),
        a = actual.getContext("2d"),
        b = independent.getContext("2d"),
        e = exported.getContext("2d");
      a.drawImage(await load(`data:image/png;base64,${png}`), 0, 0);
      for (const context of [b, e]) {
        context.fillStyle = "white";
        context.fillRect(0, 0, w, h);
      }
      b.translate(view.cx * dpr, view.cy * dpr);
      b.rotate(view.rotation);
      b.scale(view.zoom * dpr, view.zoom * dpr);
      b.transform(v[11], v[12], -v[12], v[11], v[9], v[10]);
      b.font = '32px "LinefieldTextV1", sans-serif';
      b.textBaseline = "alphabetic";
      b.fillStyle = "#" + v[5].toString(16).padStart(6, "0");
      b.globalAlpha = v[6];
      text.split("\n").forEach((line, i) => b.fillText(line, v[18], v[19] + 40 * i));
      const root = new DOMParser().parseFromString(markup, "image/svg+xml").documentElement,
        [x, y, sw, sh] = root.getAttribute("viewBox").split(/\s+/).map(Number),
        uri = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml" }));
      e.drawImage(
        await load(uri),
        (x * view.zoom + view.cx) * dpr,
        (y * view.zoom + view.cy) * dpr,
        sw * view.zoom * dpr,
        sh * view.zoom * dpr,
      );
      URL.revokeObjectURL(uri);
      const compare = (context) => {
        const aa = a.getImageData(0, 0, w, h).data,
          bb = context.getImageData(0, 0, w, h).data;
        let changed = 0,
          max = 0,
          sum = 0,
          ink = 0;
        for (let i = 0; i < aa.length; i += 4) {
          let different = false;
          ink += Number(aa[i] < 250 || aa[i + 1] < 250 || aa[i + 2] < 250);
          for (let k = 0; k < 3; k++) {
            const d = Math.abs(aa[i + k] - bb[i + k]);
            max = Math.max(max, d);
            sum += d;
            different ||= d > 2;
          }
          changed += Number(different);
        }
        return { changed, max, sum, ink, mean: sum / (w * h * 3) };
      };
      return { canvas: compare(b), svg: compare(e), view, status: lab.textStatus(), receipt: v };
    },
    { png: reference.toString("base64"), svg },
  );
  await writeFile(`${out}/results.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
  assert.ok(result.canvas.ink > 100, "text actually presented");
  assert.equal(result.svg.changed, 0, "SVG pixels stay within two channel levels");
  assert.equal(result.canvas.changed, 0, "independent Canvas2D pixel fidelity");
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
