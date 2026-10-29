import { chromium } from "@playwright/test";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { mkdir, writeFile } from "node:fs/promises";
// LFV-REC-RETRY-002: CT-02/06, INV-04/05/08, SU-14/16/17.
// Browser fault injection; not physical device loss or actual allocator exhaustion.
const url = process.env.LINEFIELD_PREVIEW_URL;
if (!url) throw Error("Set LINEFIELD_PREVIEW_URL to the candidate preview");
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/context-focus";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const mode of ["exhaust-twice", "second-loss", "new-focus"]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(url);
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const box = await host.locator("canvas").boundingBox();
    await page.mouse.move(box.x + 200, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 500, box.y + 250, { steps: 12 });
    await page.mouse.up();
    const original = await captureDrawing(frame);
    await frame.evaluate((scenario) => {
      const canvas = document.querySelector("canvas"),
        gl = canvas.getContext("webgl2");
      const raw = () =>
        Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
          String(lab.core.raw_region(0, i, 0)),
          String(lab.core.raw_region(0, i, 1)),
          lab.core.raw_local(0, i, 0),
          lab.core.raw_local(0, i, 1),
          lab.core.raw_point(0, i, 2),
        ]);
      const state = (window.focusProbe = {
        losses: 0,
        restores: 0,
        hits: 0,
        calls: 0,
        maximum: scenario === "exhaust-twice" ? 6 : scenario === "new-focus" ? 4 : 1,
        core: lab.core,
        raw: JSON.stringify(raw()),
        rawNow: raw,
      });
      canvas.addEventListener("webglcontextlost", () => state.losses++);
      canvas.addEventListener("webglcontextrestored", () => state.restores++);
      const create = gl.createProgram.bind(gl);
      gl.createProgram = (...args) => {
        state.calls++;
        if (state.losses && state.hits < state.maximum) {
          state.hits++;
          return null;
        }
        return create(...args);
      };
      window.lose = gl.getExtension("WEBGL_lose_context");
      if (!lose) throw Error("Context-loss extension unavailable");
      lose.loseContext();
    }, mode);
    await frame.waitForFunction(() => focusProbe.losses === 1);
    await frame.evaluate(() => lose.restoreContext());
    await frame.waitForFunction(() => focusProbe.restores === 1);
    let middle;
    if (mode === "second-loss") {
      await frame.waitForFunction(() => focusProbe.hits === 1);
      await frame.evaluate(() => lose.loseContext());
      await frame.waitForFunction(() => focusProbe.losses === 2);
      middle = await frame.evaluate(async () => {
        const calls = focusProbe.calls;
        // Deliberately outwait both retry delays while the second context is lost.
        await new Promise((resolve) => setTimeout(resolve, 900));
        return {
          callsBefore: calls,
          callsAfter: focusProbe.calls,
          pending: lab.renderPending(),
          lost: document.querySelector("canvas").getContext("webgl2").isContextLost(),
        };
      });
      if (middle.callsBefore !== middle.callsAfter || !middle.pending || !middle.lost)
        throw Error("Second context loss did not cancel pending reconstruction");
      await frame.evaluate(() => lose.restoreContext());
      await frame.waitForFunction(() => focusProbe.restores === 2);
    } else {
      await host.locator("#renderer-retry").waitFor({ state: "visible" });
      await host.locator("#renderer-retry").click();
      if (mode === "exhaust-twice") {
        await frame.waitForFunction(() => focusProbe.hits === 6);
        await host.locator("#renderer-retry").waitFor({ state: "visible" });
        middle = await frame.evaluate(() => ({ focused: document.activeElement.id }));
        if (middle.focused !== "renderer-retry")
          throw Error("Repeated exhaustion lost Retry focus");
        await host.locator("#renderer-retry").press("Enter");
      } else {
        await frame.waitForFunction(() => focusProbe.hits === 4);
        await host.locator("#undo").focus();
        middle = await frame.evaluate(() => ({ focused: document.activeElement.id }));
        if (middle.focused !== "undo") throw Error("New focus was not established");
      }
    }
    await frame.waitForFunction(() => !lab.renderPending(), null, { timeout: 10000 });
    const focused = await frame.evaluate(
      () => document.activeElement.id || document.activeElement.tagName,
    );
    const recovered = await captureDrawing(frame);
    const state = await frame.evaluate(() => ({
      sameCore: focusProbe.core === lab.core,
      rawPreserved: focusProbe.raw === JSON.stringify(focusProbe.rawNow()),
      hits: focusProbe.hits,
      losses: focusProbe.losses,
      restores: focusProbe.restores,
    }));
    const exact = JSON.stringify(original) === JSON.stringify(recovered);
    results.push({ mode, middle, focused, exact, ...state, errors });
    if (
      !exact ||
      !state.sameCore ||
      !state.rawPreserved ||
      state.hits !== (mode === "exhaust-twice" ? 6 : mode === "new-focus" ? 4 : 1) ||
      focused !== (mode === "new-focus" ? "undo" : "CANVAS") ||
      errors.length
    )
      throw Error("Retry lifecycle/focus changed artwork, canonical data or newer focus");
    await page.close();
  }
  console.log("PASS repeated Retry exhaustion, second context loss and newer-focus precedence");
} finally {
  await writeFile(
    `${output}/results.json`,
    JSON.stringify({ url, browser: browser.version(), results }, null, 2),
  );
  await browser.close();
}
