import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { hiddenRgbPng } from "./image-import-png.mjs";
const browser = await chromium.launch({ headless: true, channel: "chrome" }),
  context = await browser.newContext();
await context.addInitScript(() => {
  window.imageGlTrace = [];
  let active = false;
  addEventListener(
    "webglcontextrestored",
    () => {
      active = true;
    },
    true,
  );
  const p = WebGL2RenderingContext.prototype,
    getError = p.getError,
    lost = p.isContextLost;
  for (const name of Object.getOwnPropertyNames(p)) {
    const d = Object.getOwnPropertyDescriptor(p, name);
    if (
      typeof d.value !== "function" ||
      ["getError", "isContextLost", "getExtension"].includes(name)
    )
      continue;
    const original = d.value;
    p[name] = function (...args) {
      const result = original.apply(this, args);
      if (active && !lost.call(this)) {
        const error = getError.call(this);
        if (error)
          window.imageGlTrace.push({
            name,
            error,
            args: args.map((x) => (x && typeof x === "object" ? x.constructor.name : x)),
            stack: new Error().stack,
          });
      }
      return result;
    };
  }
});
const page = await context.newPage();
await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65422/");
await page.locator(".new-tile").click();
let frame;
for (let i = 0; i < 100; i++) {
  frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  if (frame && (await frame.evaluate(() => !!window.lab).catch(() => false))) break;
  await page.waitForTimeout(100);
}
await frame.locator("#editor-settings-toggle").click();
const chooser = page.waitForEvent("filechooser");
await frame.locator("#image-import-open").click();
await (
  await chooser
).setFiles({ name: "trace.png", mimeType: "image/png", buffer: hiddenRgbPng() });
await frame.waitForFunction(() => lab.core.image_count() === 1);
await frame.locator("#pen").click();
const box = await frame.locator("canvas").boundingBox();
await page.mouse.move(box.x + 100, box.y + 100);
await page.mouse.down();
await page.mouse.move(box.x + 250, box.y + 160, { steps: 20 });
await page.mouse.up();
await frame.waitForFunction(() => !lab.renderPending());
await frame.evaluate(() => {
  const ext = document
    .querySelector("canvas")
    .getContext("webgl2")
    .getExtension("WEBGL_lose_context");
  ext.loseContext();
  setTimeout(() => ext.restoreContext(), 100);
});
await page.waitForTimeout(3000);
const result = await frame.evaluate(() => ({
  trace: window.imageGlTrace,
  status: document.querySelector("#status").textContent,
  pending: lab.renderPending(),
}));
const out = process.env.LINEFIELD_EVIDENCE_DIR || "../../.build-cache/img02/context";
await mkdir(out, { recursive: true });
await writeFile(`${out}/trace.json`, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result));
await browser.close();
