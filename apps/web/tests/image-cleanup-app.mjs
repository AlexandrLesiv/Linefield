import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { hiddenRgbPng } from "./image-import-png.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img03/app";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage(),
  errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const editor = async () => {
  for (let i = 0; i < 100; i++) {
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    if (frame && (await frame.evaluate(() => !!window.lab).catch(() => false))) return frame;
    await page.waitForTimeout(100);
  }
  throw Error("Editor startup failed");
};
try {
  await page.goto(origin);
  await page.locator(".new-tile").click();
  let frame = await editor();
  await frame.locator("#editor-settings-toggle").click();
  const chooser = page.waitForEvent("filechooser");
  await frame.locator("#image-import-open").click();
  await (
    await chooser
  ).setFiles({ name: "alpha.png", mimeType: "image/png", buffer: hiddenRgbPng() });
  await frame.waitForFunction(() =>
    document.querySelector("#image-import-notice").textContent.includes("Image added"),
  );
  await frame
    .locator("#image-import-notice")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await frame.locator("canvas").focus();
  await page.keyboard.press("Backspace");
  const visible = () =>
    frame.evaluate(() => {
      const c = lab.core;
      if (!c.image_read(0x80000000, 0n, 0, 0n, 0)) return -1;
      return new Float64Array(c.memory.buffer, c.image_output_ptr(), 15)[9];
    });
  assert.equal(await visible(), 0);
  await frame.evaluate(() => lab.saving.flush(true));
  await page.waitForTimeout(1500);
  assert.equal(await frame.evaluate(() => lab.core.image_exists(0x80000000)), 1);
  await page.keyboard.press("Meta+z");
  assert.equal(await visible(), 1);
  await page.keyboard.press("Meta+Shift+z");
  assert.equal(await visible(), 0);
  await frame.evaluate(() => lab.saving.flush(true));
  await page.reload();
  frame = await editor();
  await frame.waitForFunction(() => !lab.core.image_exists(0x80000000), { timeout: 30000 });
  let status;
  for (let i = 0; i < 300; i++) {
    status = await frame.evaluate(() => lab.saving.maintenanceStatus());
    if (status.assets?.count === 0) break;
    await page.waitForTimeout(100);
  }
  assert.equal(status.assets.count, 0);
  assert.equal(
    await frame.evaluate(() => lab.core.image_count()),
    1,
    "Tombstone slot remains stable",
  );
  await frame.evaluate(() => lab.saving.flush(true));
  await page.reload();
  frame = await editor();
  assert.equal(await frame.evaluate(() => lab.core.image_exists(0x80000000)), 0);
  assert.deepEqual(errors, []);
  writeFileSync(
    output + "/results.json",
    JSON.stringify(
      {
        origin,
        status,
        errors,
        passed: [
          "delete retains Undo",
          "Undo/Redo preserve original",
          "reload retirement",
          "original reclaimed",
          "tombstone reload",
        ],
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: 5, status }));
} finally {
  await browser.close();
}
