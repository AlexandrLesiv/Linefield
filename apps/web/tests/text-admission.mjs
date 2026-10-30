import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL,
  out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/text01/admission";
if (!url) throw Error("Isolated preview required");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  checks = [];
const open = async (page) => {
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#text-tool").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  return frame;
};
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } });
  page.on("dialog", (d) => d.accept());
  const frame = await open(page);
  await frame.locator("#text-tool").click();
  await frame.locator("canvas").click({ position: { x: 500, y: 350 } });
  await frame.locator("#text-input").fill("x");
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden" });
  await frame.evaluate(() => {
    const c = lab.core;
    c.text_read(0x40000000, 0n, 0, 0n, 0);
    const v = Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)),
      bytes = new Uint8Array(c.memory.buffer, c.text_content_ptr(0x40000000), v[17]).slice();
    for (let i = 0; i < 255; i++) {
      new Uint8Array(c.memory.buffer, c.text_input_ptr(), bytes.length).set(bytes);
      if (
        c.text_create(
          bytes.length,
          v[5],
          v[6],
          v[13],
          v[14],
          v[18],
          v[19],
          0,
          0n,
          500,
          0n,
          350,
          0,
        ) >>>
          0 ===
        0xffffffff
      )
        throw Error("fixture rejected");
    }
    lab.requestRedraw();
  });
  await frame.locator("#text-edit").click();
  await frame.locator("#text-input").fill("y");
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden", timeout: 30000 });
  assert.equal(await frame.evaluate(() => lab.core.text_count()), 256);
  checks.push("editing a full visible plan replaces old label instead of double counting");
  await frame.locator("#text-tool").click();
  await frame.locator("canvas").click({ position: { x: 250, y: 250 } });
  await frame.locator("#text-input").fill("z");
  await frame.locator("#text-done").click();
  await frame.waitForFunction(() => document.querySelector("#text-error").textContent.length > 0);
  assert.equal(await frame.evaluate(() => lab.core.text_count()), 256);
  assert.equal(await frame.locator("#text-input").inputValue(), "z");
  checks.push("real UI aggregate admission preserves draft and canonical count");
  await frame.locator("#text-cancel").click();
  await page.close();
  const held = await browser.newPage({ viewport: { width: 900, height: 750 } });
  let releaseMain, releaseWorker, workerSeen;
  const mainGate = new Promise((resolve) => {
      releaseMain = resolve;
    }),
    workerGate = new Promise((resolve) => {
      releaseWorker = resolve;
    }),
    workerRequest = new Promise((resolve) => {
      workerSeen = resolve;
    });
  let requests = 0;
  await held.route("**/fonts/NotoSans-Regular-v1.ttf", async (route) => {
    if (++requests === 1) await mainGate;
    else {
      workerSeen();
      await workerGate;
    }
    await route.continue();
  });
  const hf = await open(held);
  await hf.locator("#text-tool").click();
  await hf.locator("canvas").click({ position: { x: 400, y: 300 } });
  await hf.locator("#text-input").fill("First abandoned draft");
  await hf.locator("#text-done").click();
  await hf.locator("#text-cancel").click();
  await hf.locator("canvas").click({ position: { x: 400, y: 300 } });
  await hf.locator("#text-input").fill("Second retained draft");
  assert.equal(await hf.locator("#text-input").evaluate((e) => e.readOnly), false);
  await hf.locator("#text-done").click();
  releaseMain();
  await Promise.race([
    workerRequest,
    new Promise((_, reject) => {
      setTimeout(() => reject(Error("worker font request timeout")), 15000).unref();
    }),
  ]);
  await held.waitForTimeout(50);
  assert.equal(await hf.locator("#text-input").evaluate((e) => e.readOnly), true);
  assert.equal(await hf.locator("#text-done").isDisabled(), true);
  assert.equal(await hf.evaluate(() => lab.core.text_count()), 0);
  checks.push("old cancelled font preparation cannot unlock or publish over a newer draft");
  releaseWorker();
  await hf.locator("#text-editor").waitFor({ state: "hidden" });
  assert.equal(await hf.evaluate(() => lab.core.text_count()), 1);
  checks.push("new draft publishes once after held worker font becomes available");
  await writeFile(`${out}/results.json`, JSON.stringify({ checks }, null, 2));
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
