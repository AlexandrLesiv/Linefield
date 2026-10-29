import { chromium } from "@playwright/test";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/selection-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const fault of ["allocation", "length", "pointer"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((mode) => {
      const instantiate = WebAssembly.instantiateStreaming.bind(WebAssembly);
      WebAssembly.instantiateStreaming = async (...args) => {
        const result = await instantiate(...args),
          exports = result.instance.exports;
        window.snapshotFault = { armed: false, remaining: 3, injected: 0 };
        const fail = () => {
          if (!window.snapshotFault.armed || !window.snapshotFault.remaining) return false;
          window.snapshotFault.remaining--;
          window.snapshotFault.injected++;
          return true;
        };
        return {
          module: result.module,
          instance: {
            exports: {
              ...exports,
              session_selection_snapshot() {
                if (mode !== "pointer" && fail())
                  return mode === "allocation" ? 0xffffffff : exports.count() + 1;
                return exports.session_selection_snapshot();
              },
              session_selection_snapshot_ptr() {
                return mode === "pointer" && fail() ? 1 : exports.session_selection_snapshot_ptr();
              },
            },
          },
        };
      };
    }, fault);
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65325/");
    await page.getByRole("button", { name: "New drawing", exact: true }).click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const box = await host.locator("canvas").boundingBox();
    const draw = async (y) => {
      await host.locator("#pen").click();
      await page.mouse.move(box.x + 200, box.y + y);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + y, { steps: 12 });
      await page.mouse.up();
    };
    await draw(250);
    const original = await captureDrawing(frame);
    const raw = await frame.evaluate(() => {
      window.savedOwningCore = lab.core;
      return Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
        String(lab.core.raw_region(0, i, 0)),
        String(lab.core.raw_region(0, i, 1)),
        lab.core.raw_local(0, i, 0),
        lab.core.raw_local(0, i, 1),
        lab.core.raw_point(0, i, 2),
      ]);
    });
    await host.locator("#select").click();
    await host.locator("#selection-pick-mode").click();
    await page.mouse.click(box.x + 350, box.y + 250);
    await captureDrawing(frame);
    await frame.evaluate(() => {
      window.snapshotFault.armed = true;
    });
    await host.locator("#selection-clear").click();
    await frame
      .waitForFunction(() => window.snapshotFault.injected === 3, {}, { timeout: 2500 })
      .catch(async (error) => {
        results.push({
          fault,
          failure: String(error),
          state: await frame.evaluate(() => window.snapshotFault),
          errors,
        });
        throw error;
      });
    if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(original))
      throw Error("Snapshot failure changed artwork");
    await draw(350);
    const second = await captureDrawing(frame);
    if (JSON.stringify(second) === JSON.stringify(original))
      throw Error("Rendering stopped after snapshot failure");
    await host.locator("#undo").click();
    if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(original))
      throw Error("History did not recover");
    const state = await frame.evaluate(
      (expected) => ({
        sameEngine: window.savedOwningCore === lab.core,
        rawPreserved:
          JSON.stringify(expected) ===
          JSON.stringify(
            Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
              String(lab.core.raw_region(0, i, 0)),
              String(lab.core.raw_region(0, i, 1)),
              lab.core.raw_local(0, i, 0),
              lab.core.raw_local(0, i, 1),
              lab.core.raw_point(0, i, 2),
            ]),
          ),
        injected: window.snapshotFault.injected,
      }),
      raw,
    );
    if (!state.sameEngine || !state.rawPreserved || errors.length)
      throw Error(JSON.stringify({ state, errors }));
    results.push({ fault, ...state, errors });
    await page.close();
  }
  console.log(
    "PASS repeated selection snapshot failure/bad length/bad pointer recovery; raw/artwork/history preserved",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
