import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { installLassoFault, drawLassoScene } from "./vector-lasso-worker-faults.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/lasso-worker-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const mode of [
    "normal",
    "transformed",
    "wide",
    "wide-throw",
    "throw",
    "malformed",
    "duplicate",
    "error",
    "hang",
    "hold-guard",
    "hold-apply",
    "hold-blur",
    "hold-session",
    "hold-context",
    "budget",
    "hold-clear",
    "hold-undo",
    "hold-edit",
    "hold-next",
    "hold-zoom",
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(installLassoFault, mode);
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65345");
    await page.locator(".new-tile").click();
    await page.frameLocator("iframe").locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    await drawLassoScene(frame);
    if (mode === "transformed")
      await frame.evaluate(() => {
        lab.core.move_begin();
        for (let id = 0; id < 3; id++) lab.core.move_add(id);
        if (!lab.core.transform_update(350, 265, 0.85, 0.1, 10, 0))
          throw Error("Transform setup failed");
        lab.core.move_commit();
        lab.requestRedraw();
      });
    const before = await captureDrawing(frame);
    await frame.evaluate((kind) => {
      if (kind === "budget") {
        const p = Object.getPrototypeOf(Float32Array.prototype),
          get = Object.getOwnPropertyDescriptor(p, "byteLength").get;
        // eslint-disable-next-line no-extend-native -- Test-only one-shot size-admission fault, restored in finally.
        Object.defineProperty(Float32Array.prototype, "byteLength", {
          configurable: true,
          get() {
            delete Float32Array.prototype.byteLength;
            return get.call(this) + 8388608;
          },
        });
        try {
          window.queryLasso();
        } finally {
          delete Float32Array.prototype.byteLength;
        }
      } else window.queryLasso();
    }, mode);
    if (mode.startsWith("hold")) {
      await frame.waitForFunction(() => window.lassoFault.held.length === 1);
      await frame.waitForFunction(
        () =>
          document.querySelector("#selection-status").textContent.includes("Updating selection") &&
          !!document.querySelector("#selection-lasso").getAttribute("d"),
      );
      if (mode === "hold-session") {
        await page.getByRole("button", { name: "← Back", exact: true }).click();
        await page.getByRole("button", { name: "Resume temporary drawing", exact: true }).click();
      }
      await frame.evaluate((kind) => {
        if (kind === "hold-guard" || kind === "hold-apply") {
          window.lassoFault.armed = true;
          window.lassoFault.applied = 0;
        }
        if (kind === "hold-blur") window.dispatchEvent(new Event("blur"));
        if (kind === "hold-context")
          document
            .querySelector("canvas")
            .dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
        if (kind === "hold-clear") document.querySelector("#selection-clear").click();
        if (kind === "hold-undo") document.querySelector("#undo").click();
        if (kind === "hold-edit") {
          lab.core.delete_begin();
          lab.core.delete_add(0);
          lab.core.delete_commit();
        }
        if (kind === "hold-next") {
          window.lassoEvent("pointerdown", 900, 600);
          window.lassoEvent("pointerup", 900, 600);
        }
        if (kind === "hold-zoom") {
          document
            .querySelector("canvas")
            .dispatchEvent(
              new WheelEvent("wheel", { bubbles: true, deltaY: 180, clientX: 600, clientY: 400 }),
            );
        }
        for (const deliver of window.lassoFault.held) deliver();
      }, mode);
    }
    await frame.waitForFunction(() => !lab.lassoWorker().pending, {}, { timeout: 5000 });
    const state = await frame.evaluate(() => ({
      ids: lab.selection(),
      stats: lab.lassoWorker(),
      raw: window.originalLasso === JSON.stringify(window.rawLasso()),
      created: window.lassoFault.created,
      terminated: window.lassoFault.terminated,
      wide: window.lassoFault.wide,
    }));
    const expected =
      mode === "hold-apply"
        ? [0]
        : mode.startsWith("wide")
          ? [1]
          : mode.startsWith("hold") && mode !== "hold-zoom"
            ? []
            : [0, 1];
    if (mode === "wide" && !state.wide) throw Error("Wide geometry not exercised");
    if (mode === "hold-apply") {
      await frame.waitForFunction(
        () => !!document.querySelector("#selection-outline").getAttribute("d"),
      );
      await frame.waitForFunction(() =>
        document
          .querySelector("#status")
          .textContent.includes("Injected selection publication failure"),
      );
      if (state.stats.fallback !== 0) throw Error("Partial publication was retried");
    }
    if (
      JSON.stringify(state.ids) !== JSON.stringify(expected) ||
      !state.raw ||
      state.created !== state.terminated
    )
      throw Error(`${mode}: ${JSON.stringify(state)}`);
    if (
      !mode.startsWith("hold") &&
      JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(before)
    )
      throw Error(`${mode}: drawing changed`);
    if (errors.length) throw Error(errors.join("\n"));
    results.push({ mode, ...state });
    await page.close();
    await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  }
  console.log("PASS", results.length, "Lasso worker recovery/cancellation cases");
} finally {
  await browser.close();
}
