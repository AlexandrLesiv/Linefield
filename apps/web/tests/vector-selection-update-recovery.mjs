import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
const output =
  process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/selection-update-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const mode of ["pick", "lasso"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const instantiate = WebAssembly.instantiateStreaming.bind(WebAssembly);
      WebAssembly.instantiateStreaming = async (...args) => {
        const result = await instantiate(...args),
          exports = result.instance.exports;
        window.updateFault = { remaining: -1, injected: 0 };
        return {
          module: result.module,
          instance: {
            exports: {
              ...exports,
              session_selection_set(id, selected) {
                if (window.updateFault.remaining === 0) {
                  window.updateFault.remaining = -1;
                  window.updateFault.injected++;
                  return 0;
                }
                if (window.updateFault.remaining > 0) window.updateFault.remaining--;
                return exports.session_selection_set(id, selected);
              },
            },
          },
        };
      };
    });
    await page.goto(process.env.LINEFIELD_PREVIEW_URL);
    await page.getByRole("button", { name: "New drawing", exact: true }).click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const box = await host.locator("canvas").boundingBox();
    const draw = async (y) => {
      await host.locator("#pen").click();
      await page.mouse.move(box.x + 250, box.y + y);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + y, { steps: 12 });
      await page.mouse.up();
    };
    await draw(250);
    await draw(350);
    const original = await captureDrawing(frame);
    const raw = await frame.evaluate(() => {
      window.savedCore = lab.core;
      return [0, 1].map((id) =>
        Array.from({ length: lab.core.raw_length(id) }, (_, i) => [
          String(lab.core.raw_region(id, i, 0)),
          String(lab.core.raw_region(id, i, 1)),
          lab.core.raw_local(id, i, 0),
          lab.core.raw_local(id, i, 1),
          lab.core.raw_point(id, i, 2),
        ]),
      );
    });
    await host.locator("#select").click();
    await frame.evaluate(
      (n) => {
        window.updateFault.remaining = n;
      },
      mode === "pick" ? 0 : 1,
    );
    if (mode === "pick") {
      await host.locator("#selection-pick-mode").click();
      await page.mouse.click(box.x + 350, box.y + 250);
    } else {
      await page.mouse.move(box.x + 200, box.y + 200);
      await page.mouse.down();
      for (const [x, y] of [
        [550, 200],
        [550, 400],
        [200, 400],
        [200, 200],
      ])
        await page.mouse.move(box.x + x, box.y + y, { steps: 4 });
      await page.mouse.up();
    }
    const state = await frame.evaluate(() => ({
      injected: updateFault.injected,
      selected: lab.selection(),
    }));
    if (state.injected !== 1 || state.selected.length !== (mode === "pick" ? 0 : 1))
      throw Error(JSON.stringify({ mode, state }));
    if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(original))
      throw Error("Edited artwork on rejection");
    await draw(450);
    if (JSON.stringify(await captureDrawing(frame)) === JSON.stringify(original))
      throw Error("Input remained stuck");
    await host.locator("#undo").click();
    if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(original))
      throw Error("History changed");
    const after = await frame.evaluate(() => ({
      same: savedCore === lab.core,
      raw: [0, 1].map((id) =>
        Array.from({ length: lab.core.raw_length(id) }, (_, i) => [
          String(lab.core.raw_region(id, i, 0)),
          String(lab.core.raw_region(id, i, 1)),
          lab.core.raw_local(id, i, 0),
          lab.core.raw_local(id, i, 1),
          lab.core.raw_point(id, i, 2),
        ]),
      ),
    }));
    if (!after.same || JSON.stringify(after.raw) !== JSON.stringify(raw) || errors.length)
      throw Error(JSON.stringify({ mode, errors, same: after.same }));
    results.push({ mode, ...state, rawPreserved: true, errors });
    await page.close();
  }
  console.log(
    "PASS Pick and partial Lasso update rejection: released input, retained engine/raw/artwork/history",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
