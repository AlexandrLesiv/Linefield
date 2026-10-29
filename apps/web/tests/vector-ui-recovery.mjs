import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const require = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const base = process.env.LINEFIELD_PREVIEW_URL;
if (!base) throw Error("Explicit isolated candidate URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/ui-recovery";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 1200, height: 1000 } });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on("console", (m) => {
    if (m.type() === "warning" || m.type() === "error") console.log(m.type(), m.text());
  });
  await page.goto(base);
  await page.locator(".new-tile").click();
  await page.waitForURL("**/drawing/*");
  const id = new URL(page.url()).pathname.split("/").at(-1);
  await page.locator("iframe:not([hidden])").waitFor();
  const frame = page
    .frames()
    .find((f) => new URL(f.url(), base).searchParams.get("document") === id);
  await frame.waitForFunction(() => !!window.lab);
  const canvas = frame.locator("canvas");
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + 150, box.y + 200);
  await page.mouse.down();
  await page.mouse.move(box.x + 350, box.y + 230, { steps: 12 });
  // Only the secondary contact is synthesized; primary drawing and shortcut use browser input.
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 222,
    pointerType: "touch",
    button: 0,
    buttons: 1,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 222,
    pointerType: "touch",
    button: 0,
    buttons: 0,
  });
  await page.keyboard.press("Control+Alt+d");
  assert.equal(await frame.locator("dialog[open]").count(), 0);
  await page.mouse.move(box.x + 430, box.y + 250, { steps: 4 });
  await page.mouse.up();
  await frame.evaluate(() => lab.saving.flush(true));
  assert.equal(await frame.evaluate(() => lab.core.count()), 1);
  assert.equal(await frame.evaluate(() => lab.core.visible(0)), 1);
  assert.ok((await frame.evaluate(() => lab.core.raw_length(0))) >= 17);
  results.push("Secondary-contact release does not open a modal or cancel primary stroke");
  await frame.locator(".editor-home").click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.locator(`[data-id="${id}"] .drawing-tile`).click();
  await page.locator("iframe:not([hidden])").waitFor();
  assert.equal(await frame.locator("dialog[open]").count(), 0);
  assert.equal(await frame.evaluate(() => lab.core.count()), 1);
  assert.equal(await frame.evaluate(() => lab.core.can_undo()), 1);
  results.push("Same-ID resume retains drawing/history and has no retained modal");
  // Test-process gate delays the existing save boundary; no shipping fault endpoint.
  await frame.evaluate(() => {
    window.originalFlush = lab.saving.flush;
    window.flushGate = new Promise((resolve) => {
      window.releaseFlush = resolve;
    });
    lab.saving.flush = async (...args) => {
      window.flushEntered = true;
      await window.flushGate;
      return window.originalFlush(...args);
    };
  });
  await frame.locator(".editor-home").click();
  await frame.waitForFunction(
    () => window.flushEntered && !document.querySelector("#save-stay").hidden,
  );
  await page.keyboard.press("Escape");
  await frame.waitForFunction(() => document.querySelector("#save-stay").hidden);
  assert.equal(await frame.locator("dialog[open]").count(), 0);
  await frame.evaluate(() => {
    lab.saving.flush = window.originalFlush;
    window.releaseFlush();
  });
  await page.waitForTimeout(100);
  assert.ok(page.url().endsWith("/drawing/" + id));
  assert.equal(await page.locator("iframe:not([hidden])").count(), 1);
  await canvas.focus();
  await page.keyboard.press("Control+z");
  assert.equal(await frame.evaluate(() => lab.core.visible(0)), 0);
  await page.keyboard.press("Control+Shift+z");
  assert.equal(await frame.evaluate(() => lab.core.visible(0)), 1);
  await frame.evaluate(() => lab.saving.flush(true));
  results.push("Escape cancels held leave; late flush cannot navigate and editor input resumes");
  const snapshot = () =>
    frame.evaluate(() => {
      const e = lab.core,
        token = e.save_capture(),
        out = [];
      if (!token) throw Error("capture");
      for (let stream = 0; stream < e.save_stream_count(token); stream++) {
        const bytes = [];
        for (let chunk = 0; ; chunk++) {
          const n = e.save_chunk(token, stream, chunk) >>> 0;
          if (n === 0xffffffff) throw Error("chunk");
          bytes.push(...new Uint8Array(e.memory.buffer, e.save_chunk_ptr(), n));
          if (n < 65520) break;
        }
        out.push(bytes);
      }
      e.save_release(token);
      return out;
    });
  console.log(JSON.stringify({ completed: results }));
  const before = await snapshot();
  await frame.waitForFunction(() => !lab.renderPending());
  const pixels = await canvas.screenshot();
  await canvas.focus();
  await frame.evaluate(async () => {
    const surface = document.querySelector("canvas"),
      gl = surface.getContext("webgl2");
    window.recoveryCore = lab.core;
    window.reviewGl = gl;
    window.originalCreateProgram = gl.createProgram;
    window.reviewContext = gl.getExtension("WEBGL_lose_context");
    const lost = new Promise((resolve) =>
      surface.addEventListener("webglcontextlost", resolve, { once: true }),
    );
    window.reviewContext.loseContext();
    await lost;
    gl.createProgram = () => null;
  });
  await page.waitForTimeout(200);
  await frame.evaluate(() => window.reviewContext.restoreContext());
  await page.waitForTimeout(2500);
  console.log(
    JSON.stringify(
      await frame.evaluate(() => ({
        lost: window.reviewGl.isContextLost(),
        retryHidden: document.querySelector("#renderer-retry").hidden,
        status: document.querySelector("#status").textContent,
        attention: document.querySelector("#editor-settings-toggle").outerHTML,
      })),
    ),
  );
  await frame.waitForFunction(() => !document.querySelector("#renderer-retry").hidden, null, {
    timeout: 5000,
  });
  assert.equal(await frame.locator("dialog[open]").count(), 0);
  assert.equal(await canvas.evaluate((n) => n === document.activeElement), true);
  // An unrelated save status must not erase renderer failure attention.
  await frame.evaluate(() =>
    window.dispatchEvent(new CustomEvent("linefield-save-attention", { detail: "saved" })),
  );
  assert.equal(await frame.locator("#editor-settings-toggle[data-attention]").count(), 1);
  console.log("opening settings");
  await frame.locator("#editor-settings-toggle").click();
  console.log("opening recovery");
  await frame
    .locator("#editor-settings > button:not(.editor-panel-close):not(#pressure-toggle)")
    .click();
  await frame.locator("#renderer-retry").waitFor({ state: "visible" });
  await frame.evaluate(() => {
    window.reviewGl.createProgram = window.originalCreateProgram;
  });
  console.log("retrying");
  await frame.locator("#renderer-retry").click();
  await frame.waitForFunction(
    () =>
      document.querySelector("#renderer-retry").hidden &&
      !document.querySelector("#editor-settings-toggle").hasAttribute("data-attention"),
  );
  await page.keyboard.press("Escape");
  await frame.waitForFunction(() => !lab.renderPending());
  assert.equal(await frame.evaluate(() => lab.core === window.recoveryCore), true);
  assert.deepEqual(await snapshot(), before);
  assert.deepEqual(await canvas.screenshot(), pixels);
  results.push(
    "Exhausted GPU retry exposes pointer-accessible recovery, preserves focus/raw/pixels and engine",
  );
  await mkdir(output, { recursive: true });
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      {
        base,
        browser: browser.version(),
        results,
        faultMethods:
          "Test-process save gate, secondary pointer event, GPU allocation failure; primary actions use UI",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: results.length, results }));
  await context.close();
} finally {
  await browser.close();
}
