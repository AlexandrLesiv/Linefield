import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { digest } from "./vector-saving-recovery-helpers.mjs";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated SVG02 product preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR ?? ".build-cache/svg02/fidelity";
await mkdir(output, { recursive: true });
const paper = process.env.LINEFIELD_SVG_PAPER ?? "none";
const grid = process.env.LINEFIELD_SVG_GRID ?? "none";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 700 },
    deviceScaleFactor: 2,
  });
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.locator("iframe").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab && !!document.querySelector("#svg-export-open"));
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#paper-style").selectOption(paper);
  await frame.locator("#grid-style").selectOption(grid);
  await page.keyboard.press("Escape");
  const canvas = frame.locator("canvas").first(),
    box = await canvas.boundingBox();
  for (const brush of ["0", "1", "2", "0"]) {
    await frame.locator("#brush").selectOption(brush);
    await frame.locator("#width").focus();
    await page.keyboard.press("End");
    await frame.evaluate(() => {
      const e = document.querySelector("#opacity");
      e.value = "70";
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.mouse.move(box.x + 150, box.y + 100 + Number(brush) * 65);
    await page.mouse.down();
    for (let i = 1; i <= 30; i++)
      await page.mouse.move(
        box.x + 150 + i * 10,
        box.y + 100 + Number(brush) * 65 + Math.sin(i / 3) * 35,
      );
    await page.mouse.up();
  }
  await page.mouse.move(2, 2);
  await frame.evaluate(() => document.activeElement?.blur());
  await frame.waitForFunction(() => !lab.renderPending());
  await frame.addStyleTag({ content: "main > aside { visibility: hidden !important; }" });
  const before = await digest(frame),
    reference = await canvas.screenshot();
  await writeFile(`${output}/reference.png`, reference);
  const camera = await frame.evaluate(() => ({
    view: lab.view(),
    width: document.querySelector("canvas").width,
    height: document.querySelector("canvas").height,
    dpr: devicePixelRatio,
  }));
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#svg-export-open").click();
  if (grid !== "none") await frame.locator("#svg-grid").check();
  await frame.locator("#svg-export-start").click();
  await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 60000 });
  const svg = await frame.evaluate(async () =>
    (await fetch(document.querySelector("#svg-export-download").href)).text(),
  );
  assert.equal(await digest(frame), before);
  await writeFile(`${output}/drawing.svg`, svg);
  const result = await frame.evaluate(
    async ({ source, referencePng, camera: captured }) => {
      const xml = new DOMParser().parseFromString(source, "image/svg+xml"),
        root = xml.documentElement;
      const [x, y, width, height] = root.getAttribute("viewBox").split(/\s+/).map(Number);
      const read = async (imageUrl) => {
        const image = new Image();
        image.src = imageUrl;
        await image.decode();
        return image;
      };
      const a = document.createElement("canvas"),
        b = document.createElement("canvas");
      a.width = b.width = captured.width;
      a.height = b.height = captured.height;
      const ca = a.getContext("2d"),
        cb = b.getContext("2d");
      ca.drawImage(await read(`data:image/png;base64,${referencePng}`), 0, 0);
      cb.fillStyle = "white";
      cb.fillRect(0, 0, b.width, b.height);
      const uri = URL.createObjectURL(new Blob([source], { type: "image/svg+xml" }));
      try {
        cb.drawImage(
          await read(uri),
          (x * captured.view.zoom + captured.view.cx) * captured.dpr,
          (y * captured.view.zoom + captured.view.cy) * captured.dpr,
          width * captured.view.zoom * captured.dpr,
          height * captured.view.zoom * captured.dpr,
        );
      } finally {
        URL.revokeObjectURL(uri);
      }
      const pa = ca.getImageData(0, 0, a.width, a.height),
        pb = cb.getImageData(0, 0, b.width, b.height),
        diff = cb.createImageData(b.width, b.height);
      const left = Math.round((x * captured.view.zoom + captured.view.cx) * captured.dpr);
      const top = Math.round((y * captured.view.zoom + captured.view.cy) * captured.dpr);
      const right = left + Math.round(width * captured.view.zoom * captured.dpr);
      const bottom = top + Math.round(height * captured.view.zoom * captured.dpr);
      let changed = 0,
        max = 0,
        sum = 0;
      for (let i = 0; i < pa.data.length; i += 4) {
        const px = (i / 4) % a.width,
          py = Math.floor(i / 4 / a.width);
        if (px < left || px >= right || py < top || py >= bottom) {
          diff.data[i + 3] = 255;
          continue;
        }
        let any = false;
        for (let c = 0; c < 4; c++) {
          const delta = Math.abs(pa.data[i + c] - pb.data[i + c]);
          max = Math.max(max, delta);
          sum += delta;
          any ||= delta > 0;
          diff.data[i + c] = Math.min(255, delta * 8);
        }
        diff.data[i + 3] = 255;
        changed += Number(any);
      }
      const candidate = b.toDataURL();
      cb.putImageData(diff, 0, 0);
      return {
        width: a.width,
        height: a.height,
        changed,
        max,
        sum,
        candidate,
        difference: b.toDataURL(),
        viewBox: [x, y, width, height],
      };
    },
    { source: svg, referencePng: reference.toString("base64"), camera },
  );
  for (const name of ["candidate", "difference"]) {
    await writeFile(`${output}/${name}.png`, Buffer.from(result[name].split(",")[1], "base64"));
    delete result[name];
  }
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ ...result, camera, rawUnchanged: true, paper, grid }, null, 2),
  );
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
