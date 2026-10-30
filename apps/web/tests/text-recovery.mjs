import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL,
  out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/text01/recovery";
if (!url) throw Error("Isolated preview required");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  page.on("dialog", (d) => d.accept());
  await page.addInitScript(() => {
    const NativeWorker = Worker;
    window.Worker = class extends NativeWorker {
      constructor(workerUrl, options) {
        super(workerUrl, options);
        this.isText = String(workerUrl).includes("raster-worker");
      }
      postMessage(...args) {
        if (this.isText && window.failTextWorker) {
          window.failTextWorker = false;
          throw Error("injected text worker failure");
        }
        super.postMessage(...args);
      }
    };
    const allocate = WebGL2RenderingContext.prototype.createTexture;
    WebGL2RenderingContext.prototype.createTexture = function () {
      if (window.failTextTexture) {
        window.failTextTexture = false;
        return null;
      }
      return allocate.call(this);
    };
  });
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#text-tool").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  await frame.locator("#text-tool").click();
  await frame.locator("canvas").click({ position: { x: 400, y: 300 } });
  await frame.locator("#text-input").fill("Retained draft");
  await frame.evaluate(() => {
    window.failTextWorker = true;
  });
  await frame.locator("#text-done").click();
  await frame.waitForFunction(() => document.querySelector("#text-error").textContent.length > 0);
  assert.equal(await frame.evaluate(() => lab.core.text_count()), 0);
  assert.equal(await frame.locator("#text-input").inputValue(), "Retained draft");
  checks.push("worker failure before publication preserves draft and history");
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden" });
  await frame.waitForFunction(() => lab.textStatus().queued === 0 && !lab.textStatus().error);
  checks.push("worker retry publishes prepared label");
  const content = () =>
    frame.evaluate(() => {
      const c = lab.core;
      c.text_read(0x40000000, 0n, 0, 0n, 0);
      const v = new Float64Array(c.memory.buffer, c.text_output_ptr(), 20);
      return new TextDecoder().decode(
        new Uint8Array(c.memory.buffer, c.text_content_ptr(0x40000000), v[17]),
      );
    });
  await frame.locator("#text-edit").click();
  await frame.locator("#text-input").fill("Failed GPU replacement");
  await frame.evaluate(() => {
    window.failTextTexture = true;
  });
  await frame.locator("#text-done").click();
  await frame.waitForFunction(() => document.querySelector("#text-error").textContent.length > 0);
  assert.equal(await content(), "Retained draft");
  assert.equal(await frame.locator("#text-input").inputValue(), "Failed GPU replacement");
  checks.push("GPU allocation failure preserves previous text and draft");
  await frame.locator("#text-cancel").click();
  await frame.locator("#text-edit").click();
  await frame.locator("#text-input").fill("Cancel during preparation");
  await frame.evaluate(() => {
    document.querySelector("#text-done").click();
    document.querySelector("#text-cancel").click();
  });
  await page.waitForTimeout(200);
  assert.equal(await content(), "Retained draft");
  assert.equal(await frame.locator("#text-editor").isVisible(), false);
  checks.push("cancel during asynchronous preparation cannot publish");
  await frame.evaluate(() => {
    const gl = document.querySelector("canvas").getContext("webgl2"),
      extension = gl.getExtension("WEBGL_lose_context");
    extension.loseContext();
    setTimeout(() => extension.restoreContext(), 100);
  });
  await frame.waitForFunction(
    () => !lab.renderPending() && lab.textStatus().queued === 0 && !lab.textStatus().error,
    null,
    { timeout: 30000 },
  );
  assert.equal(await content(), "Retained draft");
  checks.push("GPU context restoration regenerates canonical text");
  await frame.evaluate(() => lab.saving.flush());
  await page.reload();
  await page.frameLocator("iframe").locator("#text-tool").waitFor();
  const reopened = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await reopened.waitForFunction(
    () => !!window.lab && lab.textStatus().queued === 0 && !lab.renderPending(),
  );
  assert.equal(await reopened.evaluate(() => lab.core.text_count()), 1);
  checks.push("recovery saves and reloads only accepted text");
  await reopened.locator("#text-tool").click();
  await reopened.evaluate(() => {
    document.querySelector("#opacity").value = "0";
  });
  await reopened.locator("canvas").click({ position: { x: 250, y: 250 } });
  await reopened.locator("#text-input").fill("Invisible but editable");
  await reopened.locator("#text-done").click();
  await reopened.locator("#text-editor").waitFor({ state: "hidden" });
  assert.equal(await reopened.evaluate(() => lab.core.text_count()), 2);
  assert.equal(
    await reopened.evaluate(() => {
      const c = lab.core;
      c.text_read(0x40000001, 0n, 0, 0n, 0);
      return new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)[6];
    }),
    0,
  );
  await reopened.evaluate(() => lab.saving.flush());
  checks.push("zero-opacity text publishes once and saves without draft error");
  await reopened.locator("canvas").focus();
  await page.keyboard.press("Control+z");
  assert.equal(
    await reopened.evaluate(() => {
      const c = lab.core;
      if (!c.text_read(0x40000001, 0n, 0, 0n, 0)) return 0;
      return new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)[7];
    }),
    0,
  );
  checks.push("zero-opacity text undo is one operation");
  await writeFile(`${out}/results.json`, JSON.stringify({ checks }, null, 2));
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
