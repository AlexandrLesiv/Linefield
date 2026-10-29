import { chromium } from "@playwright/test";
import { panToRegionalOrigin } from "./vector-regional-navigation.mjs";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/cache-copy-recovery";
await mkdir(output, { recursive: true });
const results = [];
try {
  for (const brush of [0, 1, 2])
    for (const fault of [false, true]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.LINEFIELD_PREVIEW_URL);
      await page.locator(".new-tile").click();
      const host = page.frameLocator("iframe");
      await host.locator("#brush").waitFor();
      await host.locator("#brush").selectOption(String(brush));
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      const box = await host.locator("canvas").boundingBox();
      await page.mouse.move(box.x + 200, box.y + 250);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + 250, { steps: 12 });
      await page.mouse.up();
      const original = await captureDrawing(frame);
      const raw = await frame.evaluate(() =>
        Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
          String(lab.core.raw_region(0, i, 0)),
          String(lab.core.raw_region(0, i, 1)),
          lab.core.raw_point(0, i, 2),
          lab.core.raw_local(0, i, 0),
          lab.core.raw_local(0, i, 1),
        ]),
      );
      await host.locator("#select").click();
      await host.locator("#selection-pick-mode").click();
      await page.mouse.click(box.x + 350, box.y + 250);
      await captureDrawing(frame);
      await frame.evaluate((armed) => {
        window.copyFault = { armed, hit: 0 };
        const slice = Float32Array.prototype.slice;
        // Test-only allocation fault in disposable host buffers; fresh page per case.
        // eslint-disable-next-line no-extend-native
        Float32Array.prototype.slice = function (...args) {
          if (window.copyFault.armed && !(this.buffer === lab.core.memory.buffer)) {
            window.copyFault.armed = false;
            window.copyFault.hit++;
            throw new RangeError("review injected disposable cache copy failure");
          }
          return slice.apply(this, args);
        };
      }, fault);
      await page.mouse.move(box.x + 350, box.y + 250);
      await page.mouse.down();
      await page.mouse.move(box.x + 390, box.y + 280, { steps: 1 });
      await page.mouse.up();
      const moved = await captureDrawing(frame);
      await host.locator("#undo").click();
      const undone = await captureDrawing(frame);
      await host.locator("#redo").click();
      const redone = await captureDrawing(frame);
      await panToRegionalOrigin(frame, 1048576, "16");
      await panToRegionalOrigin(frame, -1048576, "0");
      const returned = await captureDrawing(frame);
      const state = await frame.evaluate(() => ({
        fault: window.copyFault,
        transform: [0, 1, 2, 3].map((i) => lab.core.stroke_transform(0, i)),
        raw: Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
          String(lab.core.raw_region(0, i, 0)),
          String(lab.core.raw_region(0, i, 1)),
          lab.core.raw_point(0, i, 2),
          lab.core.raw_local(0, i, 0),
          lab.core.raw_local(0, i, 1),
        ]),
        status: document.querySelector("#status").textContent,
      }));
      results.push({
        brush,
        fault,
        injected: state.fault.hit,
        undoExact: JSON.stringify(original) === JSON.stringify(undone),
        rebaseExact: JSON.stringify(moved) === JSON.stringify(returned),
        redoExact: JSON.stringify(moved) === JSON.stringify(redone),
        rawPreserved: JSON.stringify(raw) === JSON.stringify(state.raw),
        original,
        moved,
        undone,
        redone,
        transform: state.transform,
        status: state.status,
        errors,
      });
      await page.close();
    }
} finally {
  await browser.close();
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
}
if (
  results.some(
    (r) =>
      !r.undoExact ||
      !r.redoExact ||
      !r.rebaseExact ||
      !r.rawPreserved ||
      r.errors.length ||
      r.injected !== Number(r.fault),
  )
)
  throw Error("Disposable geometry copy recovery corrupted derived history");
console.log(
  "PASS all brushes disposable copy failure: exact move/Undo/Redo and canonical data preservation",
);
