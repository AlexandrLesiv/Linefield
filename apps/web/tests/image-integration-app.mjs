import { cameraChecks } from "./image-integration-camera.mjs";
import { editingChecks } from "./image-integration-editing.mjs";
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync } from "node:fs";
import { hiddenRgbPng } from "./image-import-png.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
});
const page = await context.newPage(),
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const output = process.env.LINEFIELD_IMAGE_OUTPUT || ".build-cache/img02";
mkdirSync(output, { recursive: true });
try {
  await page.goto(origin);
  await page.locator(".new-tile").click();
  const editor = async () => {
    for (let n = 0; n < 100; n++) {
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      if (frame && (await frame.evaluate(() => !!window.lab).catch(() => false))) return frame;
      await page.waitForTimeout(100);
    }
    throw Error("Editor startup: " + JSON.stringify(errors));
  };
  let frame = await editor();
  await frame.locator("#editor-settings-toggle").click();
  const chooser = page.waitForEvent("filechooser");
  await frame.locator("#image-import-open").click();
  await (
    await chooser
  ).setFiles({ name: "alpha.png", mimeType: "image/png", buffer: hiddenRgbPng() });
  await frame.waitForFunction(
    () => document.querySelector("#image-import-notice").textContent.includes("Image added"),
    { timeout: 30000 },
  );
  const imported = await frame.evaluate(() => {
    const c = lab.core,
      id = 0x80000000;
    c.image_read(id, 0n, 0, 0n, 0);
    return {
      count: c.image_count(),
      selected: c.session_selection_has(id),
      values: Array.from(new Float64Array(c.memory.buffer, c.image_output_ptr(), 15)),
    };
  });
  assert.equal(imported.count, 1);
  assert.equal(imported.selected, 1);
  await frame.locator("canvas").screenshot({ path: output + "/image-import.png" });
  await frame
    .locator("#image-import-notice")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await frame.locator("#image-opacity").fill("60");
  await frame.locator("#image-opacity").dispatchEvent("change");
  await frame.locator("canvas").click({ position: { x: 50, y: 50 } });
  await page.keyboard.press("Meta+z");
  assert.equal(
    await frame.evaluate(() => {
      const c = lab.core;
      c.image_read(0x80000000, 0n, 0, 0n, 0);
      return new Float64Array(c.memory.buffer, c.image_output_ptr(), 15)[8];
    }),
    1,
  );
  await page.keyboard.press("Meta+z");
  assert.equal(
    await frame.evaluate(() => {
      const c = lab.core;
      c.image_read(0x80000000, 0n, 0, 0n, 0);
      return new Float64Array(c.memory.buffer, c.image_output_ptr(), 15)[9];
    }),
    0,
  );
  await page.keyboard.press("Meta+Shift+z");
  await frame.evaluate(() => lab.saving.flush(true));
  const url = page.url();
  await page.reload();
  frame = await editor();
  const restored = await frame.evaluate(() => {
    const c = lab.core;
    c.image_read(0x80000000, 0n, 0, 0n, 0);
    return {
      count: c.image_count(),
      visible: new Float64Array(c.memory.buffer, c.image_output_ptr(), 15)[9],
    };
  });
  assert.equal(restored.count, 1);
  assert.equal(restored.visible, 1);
  await frame.waitForFunction(() => document.querySelector("#image-view-retry").hidden);
  await frame.locator("canvas").screenshot({ path: output + "/image-restored.png" });
  const editing = await editingChecks(page, frame);
  const camera = await cameraChecks(page, frame);
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#svg-export-open").click();
  await frame.locator("#svg-background").selectOption("transparent");
  await frame.locator("#svg-export-start").click();
  await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 30000 });
  const exported = await frame.evaluate(async () => {
    const svg = await (await fetch(document.querySelector("#svg-export-download").href)).text();
    const payload = svg.match(/data:image\/png;base64,([^"']+)/)?.[1];
    if (!payload) throw Error("Export omitted image pixels");
    const bitmap = await createImageBitmap(
      new Blob([Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))], { type: "image/png" }),
    );
    const pixels = new OffscreenCanvas(bitmap.width, bitmap.height),
      rasterContext = pixels.getContext("2d");
    rasterContext.drawImage(bitmap, 0, 0);
    bitmap.close();
    const values = rasterContext.getImageData(0, 0, pixels.width, pixels.height).data;
    let opaqueRed = 0;
    for (let i = 0; i < values.length; i += 4)
      if (values[i] === 255 && values[i + 1] === 0 && values[i + 2] === 0 && values[i + 3] === 255)
        opaqueRed++;
    return { svg, embedded: (svg.match(/data:image\/png;base64,/g) || []).length, opaqueRed };
  });
  assert.ok(exported.embedded > 0);
  assert.ok(exported.opaqueRed > 100, "Export preserves opaque red image interior");
  writeFileSync(output + "/image.svg", exported.svg);
  await page.screenshot({ path: output + "/image-app-full.png" });
  assert.deepEqual(errors, []);
  writeFileSync(
    output + "/app-results.json",
    JSON.stringify({ imported, restored, editing, camera, url, errors }, null, 2),
  );
  console.log(JSON.stringify({ imported, restored, url, errors }));
} finally {
  await browser.close();
}
