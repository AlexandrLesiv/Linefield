import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { paddedPng } from "./image-cleanup-fixtures.mjs";
const origin = process.env.LINEFIELD_PREVIEW_URL;
if (!origin) throw Error("Isolated preview required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/img03/capacity";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage(),
  results = [],
  errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const editor = async () => {
  for (let i = 0; i < 100; i++) {
    const f = page.frames().find((v) => v.url().includes("/vector-editor/"));
    if (f && (await f.evaluate(() => !!window.lab).catch(() => false))) return f;
    await page.waitForTimeout(100);
  }
  throw Error("Editor startup");
};
try {
  await page.goto(origin);
  await page.locator(".new-tile").click();
  let frame = await editor(),
    count = 0;
  for (const [size, valid] of [
    [16 * 1048576, true],
    [16 * 1048576 + 1, true],
    [32 * 1048576, true],
    [32 * 1048576 + 1, false],
  ]) {
    const buffer = paddedPng(size),
      start = Date.now();
    await frame.locator("#editor-settings-toggle").click();
    const chooser = page.waitForEvent("filechooser");
    await frame.locator("#image-import-open").click();
    await (await chooser).setFiles({ name: "capacity.png", mimeType: "image/png", buffer });
    await frame
      .locator("#image-import-notice")
      .getByRole("button", { name: "Close", exact: true })
      .waitFor({ state: "visible", timeout: 60000 });
    const message = await frame.locator("#image-import-notice [role=status]").textContent();
    assert.equal(message.includes("Image added"), valid, message);
    if (valid) count++;
    assert.equal(await frame.evaluate(() => lab.core.image_count()), count);
    results.push({ size, valid, readinessMs: Date.now() - start, message });
    await frame
      .locator("#image-import-notice")
      .getByRole("button", { name: "Close", exact: true })
      .click();
    if (valid) {
      await frame.evaluate(() => lab.saving.flush(true));
      const asset = await frame.evaluate(async (slot) => {
        const c = lab.core,
          id = 0x80000000 + slot;
        const digest = new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.image_digest_ptr(id), 64),
        );
        const stored = await lab.saving.readAsset(digest);
        const hash = Array.from(
          new Uint8Array(await crypto.subtle.digest("SHA-256", await stored.blob.arrayBuffer())),
          (v) => v.toString(16).padStart(2, "0"),
        ).join("");
        return { bytes: stored.blob.size, hash };
      }, count - 1);
      assert.equal(asset.bytes, size);
      assert.equal(asset.hash, createHash("sha256").update(buffer).digest("hex"));
    }
  }
  await page.reload();
  frame = await editor();
  assert.equal(await frame.evaluate(() => lab.core.image_count()), count);
  await frame.waitForFunction(() => document.querySelector("#image-view-retry").hidden);
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#svg-export-open").click();
  await frame.locator("#svg-background").selectOption("transparent");
  await frame.locator("#svg-export-start").click();
  await frame.locator("#svg-export-download").waitFor({ state: "visible", timeout: 60000 });
  const embedded = await frame.evaluate(async () => {
    const svg = await (await fetch(document.querySelector("#svg-export-download").href)).text();
    return (svg.match(/data:image\/png;base64,/g) || []).length;
  });
  assert.equal(embedded, count);
  assert.deepEqual(errors, []);
  writeFileSync(
    output + "/results.json",
    JSON.stringify({ origin, results, embedded, errors }, null, 2),
  );
  console.log(JSON.stringify({ results, embedded }));
} finally {
  await browser.close();
}
