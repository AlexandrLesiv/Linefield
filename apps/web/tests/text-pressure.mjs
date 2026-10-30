import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL,
  out = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/text01/pressure";
if (!url) throw Error("Isolated preview required");
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  checks = [];
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 850 } }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#text-tool").waitFor();
  const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#paper-style").selectOption("none");
  await page.keyboard.press("Escape");
  await frame.locator("#text-tool").click();
  await frame.locator("canvas").click({ position: { x: 500, y: 350 } });
  await frame.locator("#text-input").fill("x");
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden" });
  // Browser E2E capacity fixture: canonical Rust commands reproduce a valid dense saved scene.
  await frame.evaluate(() => {
    const c = lab.core;
    c.text_read(0x40000000, 0n, 0, 0n, 0);
    const v = Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20)),
      bytes = new Uint8Array(c.memory.buffer, c.text_content_ptr(0x40000000), v[17]).slice();
    for (let i = 0; i < 260; i++) {
      new Uint8Array(c.memory.buffer, c.text_input_ptr(), bytes.length).set(bytes);
      if (
        c.text_create(bytes.length, v[5], v[6], v[13], v[14], v[18], v[19], 0, 0n, 500, 0n, 350) >>>
          0 ===
        0xffffffff
      )
        throw Error("fixture rejected");
    }
    lab.requestRedraw();
  });
  await frame.waitForFunction(() => lab.textStatus().error === "text-view-limit");
  checks.push("dense valid scene reports explicit text planning limit");
  await frame.locator("#pen").click();
  const canvas = frame.locator("canvas"),
    box = await canvas.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 550);
  await page.mouse.down();
  await page.mouse.move(box.x + 300, box.y + 600, { steps: 30 });
  await page.mouse.up();
  await frame.waitForFunction(
    () => lab.core.count() === 1 && lab.core.raw_length(0) >= 31 && !lab.renderPending(),
  );
  checks.push("planning limit does not prevent new accepted ink or rendering");
  const before = await frame.evaluate(() => lab.view());
  await page.keyboard.down("Space");
  await page.mouse.move(box.x + 400, box.y + 400);
  await page.mouse.down();
  await page.mouse.move(box.x + 500, box.y + 450, { steps: 10 });
  await page.mouse.up();
  await page.keyboard.up("Space");
  const after = await frame.evaluate(() => lab.view());
  assert.notEqual(after.cx, before.cx);
  checks.push("camera continues under text planning limit");
  await frame.evaluate(() => lab.saving.flush());
  assert.equal(await frame.evaluate(() => lab.core.text_count()), 261);
  checks.push("all accepted text survives dense-scene save");
  assert.deepEqual(errors, []);
  await page.close();
  const narrow = await browser.newPage({ viewport: { width: 390, height: 700 } });
  await narrow.goto(url);
  await narrow.locator(".new-tile").click();
  await narrow.frameLocator("iframe").locator("#text-tool").waitFor();
  const nf = narrow.frames().find((f) => f.url().includes("/vector-editor/"));
  await nf.locator("#text-tool").click();
  await nf.locator("canvas").click({ position: { x: 150, y: 200 } });
  await nf.locator("#text-input").fill("日本語 😀\nSecond line");
  await nf.locator("#text-fallback").waitFor({ state: "visible" });
  const dialog = await nf.locator("#text-editor").boundingBox();
  assert.ok(dialog.x >= 0 && dialog.x + dialog.width <= 391 && dialog.height <= 700);
  checks.push("390px native sheet fits and fallback warning is visible");
  await narrow.screenshot({ path: `${out}/narrow.png` });
  await nf.locator("#text-cancel").click();
  assert.equal(await nf.evaluate(() => lab.core.text_count()), 0);
  checks.push("narrow native editor cancel preserves empty document");
  await writeFile(`${out}/results.json`, JSON.stringify({ checks }, null, 2));
  console.log(JSON.stringify({ checks }));
} finally {
  await browser.close();
}
