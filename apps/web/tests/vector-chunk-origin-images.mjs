import { checkWideTranslation } from "./vector-wide-transform.mjs";
import { observeGeometryWorker } from "./vector-worker-observation.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { panToRegionalOrigin } from "./vector-regional-navigation.mjs";

const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/chunk-origin-images";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const clip = { x: 0, y: 220, width: 100, height: 330 };
try {
  for (const [extent, brush] of [1048576, 4294967296].flatMap((value) =>
    [0, 1, 2].map((tool) => [value, tool]),
  )) {
    for (const compact of [true, false]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      await observeGeometryWorker(
        page,
        process.env.LINEFIELD_FORCE_WORKER_FAILURE === "1",
        process.env.LINEFIELD_CORRUPT_WIDE_WORKER === "1",
        process.env.LINEFIELD_FAIL_WORKER_COPY === "1",
      );
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65307/");
      await page.locator(".new-tile").click();
      const host = page.frameLocator("iframe");
      await host.locator("#brush").waitFor();
      await host.locator("#brush").selectOption(String(brush));
      const frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      if (process.env.LINEFIELD_FORCE_WORKER_FAILURE === "1")
        await frame.waitForFunction(() => window.geometryWorkerRetired);
      await panToRegionalOrigin(frame, extent);
      const blank = await captureDrawing(frame, clip);
      await frame.evaluate(
        ({ extent: sourceExtent, compact: compactSource }) => {
          document.querySelector("#pen").click();
          const canvas = document.querySelector("canvas"),
            r = canvas.getBoundingClientRect();
          const names = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"];
          const saved = names.map((name) => Object.getOwnPropertyDescriptor(canvas, name));
          canvas.setPointerCapture = () => {};
          canvas.hasPointerCapture = () => true;
          canvas.releasePointerCapture = () => {};
          const send = (type, x, y) =>
            canvas.dispatchEvent(
              new PointerEvent(type, {
                bubbles: true,
                pointerId: 312,
                pointerType: "pen",
                button: 0,
                buttons: type === "pointerup" ? 0 : 1,
                pressure: 0.7,
                clientX: r.x + x,
                clientY: r.y + y,
              }),
            );
          try {
            for (let i = 0; i < 385; i++)
              send(
                i ? "pointermove" : "pointerdown",
                !compactSource && !i ? -sourceExtent : i / 16,
                100 + i,
              );
            send("pointerup", 24, 484);
          } finally {
            names.forEach((name, i) =>
              saved[i] ? Object.defineProperty(canvas, name, saved[i]) : delete canvas[name],
            );
          }
        },
        { extent, compact },
      );
      const before = await captureDrawing(frame, clip);
      if (JSON.stringify(before) === JSON.stringify(blank)) throw Error("Tail stayed blank");
      const raw = await frame.evaluate(() =>
        Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
          String(lab.core.raw_region(0, i, 0)),
          lab.core.raw_local(0, i, 0),
          lab.core.raw_local(0, i, 1),
        ]),
      );
      await host.locator("#undo").click();
      const undone = await captureDrawing(frame, clip);
      await host.locator("#redo").click();
      const after = await captureDrawing(frame, clip);
      if (
        JSON.stringify(before) !== JSON.stringify(after) ||
        JSON.stringify(blank) !== JSON.stringify(undone)
      )
        throw Error("History changed tail pixels");
      const moved =
        process.env.LINEFIELD_WIDE_TRANSLATION === "1"
          ? await checkWideTranslation(page, frame, clip, before)
          : null;
      await host.locator("#slice").click();
      await host.locator("#slice-width-number").fill("0");
      await host.locator("#slice-width-number").dispatchEvent("change");
      const box = await host.locator("canvas").boundingBox();
      await page.mouse.move(box.x + 2, box.y + 400);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 400, { steps: 8 });
      await page.mouse.up();
      const sliced = await captureDrawing(frame, clip);
      const visible = await frame.evaluate(() =>
        Array.from({ length: lab.core.count() }, (_, i) => i).filter((i) => lab.core.visible(i)),
      );
      if (visible.length !== 2 || JSON.stringify(sliced) !== JSON.stringify(before))
        throw Error("Zero-width Slice changed tail pixels or failed to split");
      await host.locator("#undo").click();
      const restored = await captureDrawing(frame, clip);
      if (JSON.stringify(restored) !== JSON.stringify(before))
        throw Error("Slice Undo changed tail pixels");
      const worker = await frame.evaluate(() => window.geometryWorkerStats);
      if (
        worker.maximumPending > 8 ||
        worker.maximumInputBytes > 12336 ||
        worker.maximumOutputBytes > 196608
      )
        throw Error("Worker transfer exceeded the shared bounds");
      if (worker.detached !== worker.inputs32 + worker.inputs64)
        throw Error("Worker input was copied instead of transferred");
      if (
        !compact &&
        process.env.LINEFIELD_FORCE_WORKER_FAILURE !== "1" &&
        process.env.LINEFIELD_FAIL_WORKER_COPY !== "1" &&
        !worker.outputs64
      )
        throw Error("Wide worker path was not exercised");
      if (
        !compact &&
        process.env.LINEFIELD_CORRUPT_WIDE_WORKER === "1" &&
        (!worker.corrupted || !worker.retired)
      )
        throw Error("Wrong-precision worker response did not retire the worker");
      if (
        process.env.LINEFIELD_FAIL_WORKER_COPY === "1" &&
        (worker.copyFailure !== (compact ? "Float32Array" : "Float64Array") || !worker.retired)
      )
        throw Error("Worker-input allocation failure did not recover through retirement");
      results.push({
        moved,
        extent,
        brush,
        compact,
        before,
        after,
        sliced,
        restored,
        samples: raw.length,
        worker,
        errors,
      });
      if (errors.length) throw Error(errors.join("; "));
      await page.close();
    }
    const pair = results.slice(-2);
    if (JSON.stringify(pair[0].moved) !== JSON.stringify(pair[1].moved))
      throw Error(`Compact and long-source translated images differ at ${extent}`);
    if (JSON.stringify(pair[0].before) !== JSON.stringify(pair[1].before))
      throw Error(`Compact and long-source tail images differ at ${extent}`);
  }
  console.log(
    "PASS exact visible chunk-seam/tail pixels and history for compact versus long sources at two origins",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
