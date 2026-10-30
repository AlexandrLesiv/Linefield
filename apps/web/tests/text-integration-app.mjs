import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Isolated candidate URL required");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/text01/app";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
let page, frame;
const checks = [];
try {
  page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.locator(".new-tile").click();
  const getFrame = async () => {
    await page.frameLocator("iframe").locator("#text-tool").waitFor();
    const f = page.frames().find((v) => v.url().includes("/vector-editor/"));
    await f.waitForFunction(() => !!window.lab);
    return f;
  };
  frame = await getFrame();
  const read = () =>
    frame.evaluate(() => {
      const c = lab.core,
        id = 0x40000000;
      if (!c.text_read(id, 0n, 0, 0n, 0)) return null;
      const v = Array.from(new Float64Array(c.memory.buffer, c.text_output_ptr(), 20));
      return {
        values: v,
        text: new TextDecoder().decode(
          new Uint8Array(c.memory.buffer, c.text_content_ptr(id), v[17]),
        ),
      };
    });
  const check = (v, n) => {
    assert.ok(v, n);
    checks.push(n);
  };
  await frame.locator("#text-tool").click();
  await frame.locator("canvas").click({ position: { x: 400, y: 300 } });
  await frame.locator("#text-input").fill("Привіт café 😀\n\n");
  await frame.locator("#text-input").dispatchEvent("compositionstart", { data: "і" });
  check((await frame.evaluate(() => lab.core.text_count())) === 0, "composition remains draft");
  await frame.locator("#text-input").dispatchEvent("compositionend", { data: "і" });
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden" });
  const first = await read();
  check(first.text === "Привіт café 😀\n\n", "UI create preserves Unicode and trailing lines");
  check(
    first.values[16] === 1 && first.values[18] > 0 && first.values[19] > 0,
    "persisted layout receipt",
  );
  await frame.locator("#text-edit").click();
  await frame.locator("#text-input").fill("discard this draft");
  await frame.locator("#text-cancel").click();
  check((await read()).text === first.text, "UI cancel preserves document");
  await frame.locator("#text-edit").click();
  await frame.locator("#text-input").fill("Longer editable label Україна");
  await frame.locator("#text-done").click();
  await frame.locator("#text-editor").waitFor({ state: "hidden" });
  const changed = await read();
  const center = (v) => [
    v[9] + (v[11] * v[13]) / 2 - (v[12] * v[14]) / 2,
    v[10] + (v[12] * v[13]) / 2 + (v[11] * v[14]) / 2,
  ];
  check(
    center(first.values).every((v, i) => Math.abs(v - center(changed.values)[i]) < 1e-8),
    "UI edit keeps center",
  );
  await frame.locator("canvas").focus();
  await page.keyboard.press("Control+z");
  check((await read()).text === first.text, "UI undo one edit");
  await page.keyboard.press("Control+Shift+z");
  check((await read()).text === changed.text, "UI redo one edit");
  await frame.locator("#pen").click();
  const box = await frame.locator("canvas").boundingBox();
  await page.mouse.move(box.x + 120, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + 260, box.y + 170, { steps: 20 });
  await page.mouse.up();
  await frame.waitForFunction(() => lab.core.count() > 0 && lab.core.raw_length(0) > 0);
  const raw = () =>
    frame.evaluate(() => {
      const c = lab.core;
      return Array.from({ length: c.count() }, (_, id) =>
        Array.from({ length: c.raw_length(id) }, (_point, i) => [
          String(c.raw_region(id, i, 0)),
          c.raw_local(id, i, 0),
          String(c.raw_region(id, i, 1)),
          c.raw_local(id, i, 1),
          c.raw_point(id, i, 2),
        ]),
      );
    });
  const mouse = await raw();
  check(mouse[0].length >= 21, "mouse resumes after dialog");
  const pen = await page.context().newCDPSession(page);
  const penEvent = (type, i, buttons) =>
    pen.send("Input.dispatchMouseEvent", {
      type,
      x: box.x + 180 + i * 4,
      y: box.y + 230 + i,
      button: type === "mouseMoved" ? "none" : "left",
      buttons,
      pointerType: "pen",
      force: buttons ? 0.6 : 0,
    });
  await penEvent("mousePressed", 0, 1);
  for (let i = 1; i <= 24; i++) await penEvent("mouseMoved", i, 1);
  await penEvent("mouseReleased", 24, 0);
  await pen.detach();
  const accepted = await raw();
  check(
    accepted.length === 2 && accepted[1].length >= 25,
    "pen resumes with all dispatched samples",
  );
  await page.keyboard.press("Control+s");
  await frame.waitForFunction(() => lab.saving.state().phase === "saved", null, { timeout: 60000 });
  const beforeReload = await read();
  await page.reload();
  frame = await getFrame();
  await frame.waitForFunction(() => lab.core.text_count() === 1 && lab.core.count() === 2);
  check(
    JSON.stringify(await raw()) === JSON.stringify(accepted),
    "saved pen and mouse raw samples exact after reload",
  );
  const afterReload = await read();
  check(
    afterReload.text === beforeReload.text &&
      JSON.stringify(afterReload.values) === JSON.stringify(beforeReload.values),
    "editable text and receipt exact after reload",
  );
  await frame.locator("#editor-settings-toggle").click();
  await frame.locator("#svg-export-open").click();
  await frame.locator("#svg-background").selectOption("transparent");
  await frame.locator("#svg-export-start").click();
  await frame
    .locator("#svg-export-notice button")
    .last()
    .waitFor({ state: "visible", timeout: 90000 });
  check(
    await frame.locator("#svg-export-download").isVisible(),
    await frame.locator("#svg-export-notice").innerText(),
  );
  const exported = await frame.evaluate(async () => {
    const data = await (await fetch(document.querySelector("#svg-export-download").href)).text();
    const xml = new DOMParser().parseFromString(data, "image/svg+xml");
    const image = new Image();
    image.src = URL.createObjectURL(new Blob([data], { type: "image/svg+xml" }));
    await image.decode();
    const result = {
      images: xml.querySelectorAll("image").length,
      errors: xml.querySelectorAll("parsererror").length,
      width: image.naturalWidth,
      height: image.naturalHeight,
      external: /https?:\/\//.test(data.replace(/http:\/\/www.w3.org\/2000\/svg/g, "")),
    };
    URL.revokeObjectURL(image.src);
    return result;
  });
  check(
    exported.images >= 1 &&
      !exported.errors &&
      exported.width > 0 &&
      exported.height > 0 &&
      !exported.external,
    "SVG self-contained decodable appearance snapshot",
  );
  check(errors.length === 0, "no application errors");
  await page.screenshot({ path: output + "/text-app.png", fullPage: true });
  await writeFile(output + "/results.json", JSON.stringify({ checks, exported, errors }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, results: checks, exported }));
} catch (error) {
  const diagnostic = frame
    ? await frame
        .locator("body")
        .innerText()
        .catch(() => "")
    : "";
  if (page)
    await page.screenshot({ path: output + "/failure.png", fullPage: true }).catch(() => {});
  await writeFile(
    output + "/failure.json",
    JSON.stringify({ checks, error: String(error), diagnostic }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
}
