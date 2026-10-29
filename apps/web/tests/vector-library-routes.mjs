import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(new URL("../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const base = process.env.LINEFIELD_PREVIEW_URL;
if (!base) throw Error("Explicit candidate URL required");
const output = ".build-cache/save06-route-review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({
  viewport: { width: 1200, height: 1000 },
  deviceScaleFactor: 2,
});
const page = await context.newPage();
page.setDefaultTimeout(40000);
const results = [];
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
const id = () => new URL(page.url()).pathname.split("/").at(-1);
const frameFor = (document) =>
  page
    .frames()
    .find((frame) => new URL(frame.url(), base).searchParams.get("document") === document);
async function ready(document) {
  await page.locator("iframe:not([hidden])").waitFor();
  const frame = frameFor(document);
  assert.ok(frame);
  await frame.waitForFunction(() => !!window.lab);
  return frame;
}
async function back() {
  await page.getByRole("button", { name: "← Back", exact: true }).click();
  await page.locator(".drawing-surface").waitFor({ state: "detached" });
  await page.waitForFunction(() => !document.querySelector("main.gallery")?.inert);
}
async function draw(frame, offset) {
  const box = await frame.locator("canvas").boundingBox();
  assert.ok(box);
  await page.mouse.move(box.x + 140, box.y + offset);
  await page.mouse.down();
  await page.mouse.move(box.x + 360, box.y + offset + 30, { steps: 12 });
  await page.mouse.up();
  await frame.evaluate(() => lab.saving.flush(true));
}
async function openCard(document) {
  await page.locator(`[data-id="${document}"] .drawing-tile`).click();
  return ready(document);
}
async function snapshot(frame) {
  return frame.evaluate(() => ({
    count: lab.core.count(),
    undo: lab.core.can_undo(),
    revision: String(lab.core.delta_revision()),
    samples: Array.from({ length: lab.core.count() }, (_, i) => lab.core.raw_length(i)),
  }));
}
async function delayNextEngine(abort) {
  let enter, release;
  const entered = new Promise((resolve) => (enter = resolve));
  const gate = new Promise((resolve) => (release = resolve));
  await page.route("**/vector-editor/core.wasm", async (route) => {
    enter();
    await gate;
    if (abort) await route.abort("failed");
    else await route.continue();
  });
  return { entered, release, dispose: () => page.unroute("**/vector-editor/core.wasm") };
}
try {
  await page.goto(base);
  await page.locator(".new-tile").click();
  await page.waitForURL("**/drawing/*");
  const a = id();
  let af = await ready(a);
  await draw(af, 220);
  await back();
  await page.locator(".new-tile").click();
  await page.waitForURL("**/drawing/*");
  const b = id();
  const bf = await ready(b);
  await draw(bf, 300);
  await back();
  af = await openCard(a);
  await draw(af, 260);
  await back();
  const retained = await snapshot(af);
  assert.ok(retained.undo);
  const failed = await delayNextEngine(true);
  await page.locator(`[data-id="${b}"] .drawing-tile`).click();
  await failed.entered;
  assert.equal(page.frames().includes(af), true);
  failed.release();
  await page.waitForFunction(
    () => location.pathname === "/" && document.querySelectorAll("iframe").length === 1,
  );
  await failed.dispose();
  assert.equal(page.frames().includes(af), true);
  assert.deepEqual(await snapshot(af), retained);
  assert.equal(await page.locator(".drawing-surface").count(), 0);
  const resumed = await openCard(a);
  assert.equal(resumed, af);
  await resumed.locator("#undo").click();
  await resumed.waitForFunction(() => lab.core.delta_revision() > lab.core.delta_durable());
  await resumed.locator("#redo").click();
  await resumed.evaluate(() => lab.saving.flush(true));
  await back();
  results.push("failed candidate keeps prior engine, content, history and resumability");
  const delayed = await delayNextEngine(false);
  await page.locator(`[data-id="${b}"] .drawing-tile`).click();
  await delayed.entered;
  await page.goBack();
  delayed.release();
  await page.waitForFunction(
    () =>
      location.pathname === "/" &&
      !document.querySelector(".drawing-surface") &&
      !document.querySelector("header")?.inert,
  );
  await delayed.dispose();
  results.push("Back during delayed open settles at latest gallery route");
  await page.goForward();
  await ready(b);
  assert.equal(id(), b);
  await back();
  results.push("Forward after delayed open reaches intended drawing");
  af = await openCard(a);
  await draw(af, 310);
  await af.evaluate(() => {
    const original = linefieldEditorSession;
    let release;
    const gate = new Promise((resolve) => (release = resolve));
    globalThis.releaseReviewLeave = release;
    globalThis.linefieldEditorSession = {
      ...original,
      requestLeave: async () => {
        globalThis.reviewLeaveEntered = true;
        await gate;
        return original.requestLeave();
      },
    };
  });
  await page.goBack();
  await af.waitForFunction(() => globalThis.reviewLeaveEntered);
  await page.goForward();
  await af.evaluate(() => globalThis.releaseReviewLeave());
  await page.waitForFunction(
    (documentId) =>
      location.pathname === "/drawing/" + documentId &&
      !!document.querySelector(".drawing-surface") &&
      !!document.querySelector("iframe:not([hidden])"),
    a,
  );
  assert.equal(await ready(a), af);
  results.push(
    "Back then Forward during paused leave re-reads latest route and retains same engine",
  );
  await writeFile(
    output + "/results.json",
    JSON.stringify(
      { base, browser: browser.version(), results, expectedStartupErrors: errors },
      null,
      2,
    ),
  );
  console.log(JSON.stringify({ passed: results.length, results, output }));
} catch (error) {
  await page.screenshot({ path: output + "/failure.png" }).catch(() => {});
  await writeFile(
    output + "/failure.json",
    JSON.stringify({ error: String(error), url: page.url(), results, errors }, null, 2),
  );
  throw error;
} finally {
  await browser.close();
}
