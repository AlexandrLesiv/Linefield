import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/worker-stale-results";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const sourceExtent = Number(process.env.LINEFIELD_SOURCE_EXTENT || 0);
if (![0, 1048576, 4294967296].includes(sourceExtent)) throw Error("Unsupported source extent");
try {
  for (const [brush, delayed] of [0, 1, 2].flatMap((tool) => [
    [tool, false],
    [tool, true],
  ])) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
      deviceScaleFactor: 2,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript((hold) => {
      const Original = Worker;
      window.heldGeometry = {
        queue: [],
        total: 0,
        maximum: 0,
        holding: hold,
        retired: false,
        wide: 0,
      };
      window.Worker = class extends Original {
        set onmessage(callback) {
          super.onmessage = (event) => {
            const state = window.heldGeometry;
            if (event.data?.output instanceof Float64Array) state.wide++;
            if (event.data?.output && state.holding) {
              state.queue.push(() => callback(event));
              state.total++;
              state.maximum = Math.max(state.maximum, state.queue.length);
            } else callback(event);
          };
        }
        terminate() {
          window.heldGeometry.retired = true;
          super.terminate();
        }
      };
      window.flushGeometry = () => {
        heldGeometry.holding = false;
        for (const deliver of heldGeometry.queue.splice(0).reverse()) deliver();
      };
    }, delayed);
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65327/");
    await page.getByRole("button", { name: "New drawing", exact: true }).click();
    const host = page.frameLocator("iframe");
    await host.locator("#brush").waitFor();
    await host.locator("#brush").selectOption(String(brush));
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    await frame.evaluate((extent) => {
      const canvas = document.querySelector("canvas"),
        r = canvas.getBoundingClientRect();
      canvas.setPointerCapture = () => {};
      canvas.hasPointerCapture = () => true;
      canvas.releasePointerCapture = () => {};
      window.sendStroke = (offset) => {
        const send = (type, i) =>
          canvas.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 731,
              pointerType: "pen",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure: 0.7,
              clientX: r.x + 200 + i * 1.5 - (i === 0 ? extent : 0),
              clientY: r.y + 200 + offset + 20 * Math.sin(i / 12),
            }),
          );
        document.querySelector("#pen").click();
        for (let i = 0; i < 385; i++) send(i ? "pointermove" : "pointerdown", i);
        send("pointerup", 384);
      };
      for (let i = 0; i < 12; i++) sendStroke(i * 25);
    }, sourceExtent);
    if (delayed) await frame.waitForFunction(() => heldGeometry.total > 0, {}, { timeout: 3000 });
    // Invalidate document visibility and traverse a regional origin while actual
    // completed geometry responses remain held. No fabricated geometry is used.
    await host.locator("#undo").click();
    for (const delta of [1048576, -1048576]) {
      await frame.evaluate((amount) => {
        const canvas = document.querySelector("canvas"),
          r = canvas.getBoundingClientRect();
        document.querySelector("#pan").click();
        for (const [type, x] of [
          ["pointerdown", 100],
          ["pointermove", 100 - amount],
          ["pointerup", 100 - amount],
        ])
          canvas.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 732,
              pointerType: "mouse",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              clientX: r.x + x,
              clientY: r.y + 100,
            }),
          );
      }, delta);
      // Do not wait for preparation idle while deliberately withholding replies.
      await frame.waitForFunction(
        (expected) => lab.viewOrigin()[0] === expected,
        delta > 0 ? "16" : "0",
      );
    }
    await frame.evaluate(() => flushGeometry());
    const undone = await captureDrawing(frame);
    await host.locator("#redo").click();
    const restored = await captureDrawing(frame);
    await frame.evaluate(() => sendStroke(330));
    const added = await captureDrawing(frame);
    const state = await frame.evaluate(() => ({
      origin: lab.viewOrigin(),
      held: heldGeometry.total,
      wide: heldGeometry.wide,
      maximum: heldGeometry.maximum,
      retired: heldGeometry.retired,
      strokes: Array.from({ length: lab.core.count() }, (_, id) => ({
        visible: lab.core.visible(id),
        raw: Array.from({ length: lab.core.raw_length(id) }, (_point, i) => [
          String(lab.core.raw_region(id, i, 0)),
          String(lab.core.raw_region(id, i, 1)),
          lab.core.raw_local(id, i, 0),
          lab.core.raw_local(id, i, 1),
          lab.core.raw_point(id, i, 2),
        ]),
      })),
    }));
    if ((sourceExtent && !state.wide) || state.maximum > 8 || state.retired || errors.length)
      throw Error(
        JSON.stringify({
          held: state.held,
          maximum: state.maximum,
          retired: state.retired,
          errors,
        }),
      );
    results.push({ brush, delayed, sourceExtent, undone, restored, added, ...state, errors });
    await page.close();
  }
  for (let pair = 0; pair < results.length; pair += 2)
    for (const key of ["undone", "restored", "added", "origin", "strokes"])
      if (JSON.stringify(results[pair][key]) !== JSON.stringify(results[pair + 1][key]))
        throw Error(
          `Delayed/reversed worker responses changed brush ${results[pair].brush} ${key}`,
        );
  console.log(
    "PASS held/reversed real worker outputs across Undo, regional pan and Redo: exact images/raw; bounded pending responses",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
