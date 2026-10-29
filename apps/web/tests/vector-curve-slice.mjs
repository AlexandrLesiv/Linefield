import { panToRegionalOrigin } from "./vector-regional-navigation.mjs";
import { chromium } from "@playwright/test";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/curve-slice-reference";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const origin = Number(process.env.LINEFIELD_PARITY_ORIGIN || 0);
const sliceWidth = Number(process.env.LINEFIELD_SLICE_WIDTH || 0);
if (!Number.isFinite(origin) || !Number.isInteger(origin) || BigInt(origin) % 196608n !== 0n)
  throw Error("Origin must preserve paper periods");
if (![0, 12].includes(sliceWidth)) throw Error("Unsupported Slice width");
try {
  for (const integrated of [false, true]) {
    for (let brush = 0; brush < 3; brush++) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: integrated ? 1000 : 948 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        integrated
          ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65328/"
          : "http://127.0.0.1:65280/",
      );
      if (integrated) {
        await page.locator(".new-tile").click();
        await page.frameLocator("iframe").locator("#brush").waitFor();
      }
      const frame = integrated
        ? page.frames().find((f) => f.url().includes("/vector-editor/"))
        : page.mainFrame();
      await frame.waitForFunction(() => !!window.lab);
      await frame.locator("#brush").selectOption(String(brush));
      if (integrated && origin) await panToRegionalOrigin(frame, origin);
      await frame.locator("#pen").click();
      await frame.evaluate(() => {
        const c = document.querySelector("canvas"),
          r = c.getBoundingClientRect();
        c.setPointerCapture = () => {};
        c.hasPointerCapture = () => true;
        c.releasePointerCapture = () => {};
        const send = (type, i) =>
          c.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 312,
              pointerType: "pen",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure: 0.7,
              clientX: r.x + 40 + 25 * Math.sin(i / 18),
              clientY: r.y + 100 + i,
            }),
          );
        for (let i = 0; i < 385; i++) send(i ? "pointermove" : "pointerdown", i);
        send("pointerup", 384);
      });
      const clip = { x: 0, y: 220, width: 100, height: 330 };
      const before = await captureDrawing(frame, clip);
      const raw = () =>
        frame.evaluate(() =>
          Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
            ...(lab.core.raw_region
              ? [
                  String(lab.core.raw_region(0, i, 0)),
                  String(lab.core.raw_region(0, i, 1)),
                  lab.core.raw_local(0, i, 0),
                  lab.core.raw_local(0, i, 1),
                ]
              : [lab.core.raw_point(0, i, 0), lab.core.raw_point(0, i, 1)]),
            lab.core.raw_point(0, i, 2),
          ]),
        );
      const samples = await raw();
      await frame.locator("#slice").click();
      await frame.locator("#slice-width-number").fill(String(sliceWidth));
      await frame.locator("#slice-width-number").dispatchEvent("change");
      const box = await frame.locator("canvas").boundingBox();
      await page.mouse.move(box.x + 2, box.y + 400);
      await page.mouse.down();
      await page.mouse.move(box.x + 80, box.y + 400, { steps: 8 });
      await page.mouse.up();
      const sliced = await captureDrawing(frame, clip);
      const visible = await frame.evaluate(() =>
        Array.from({ length: lab.core.count() }, (_, id) => id).filter((id) =>
          lab.core.visible(id),
        ),
      );
      await frame.locator("#undo").click();
      const restored = await captureDrawing(frame, clip);
      if (visible.length !== 2 || JSON.stringify(restored) !== JSON.stringify(before))
        throw Error("Slice/history failed");
      await frame.locator("#redo").click();
      if (
        JSON.stringify(await captureDrawing(frame, clip)) !== JSON.stringify(sliced) ||
        JSON.stringify(await raw()) !== JSON.stringify(samples) ||
        errors.length
      )
        throw Error("Redo/raw preservation/browser failure");
      results.push({
        origin: integrated ? origin : 0,
        sliceWidth,
        errors,
        integrated,
        brush,
        before,
        sliced,
        changed: JSON.stringify(before) !== JSON.stringify(sliced),
      });
      await page.close();
    }
  }
  for (let i = 0; i < 3; i++) {
    if (
      JSON.stringify(results[i].before) !== JSON.stringify(results[i + 3].before) ||
      JSON.stringify(results[i].sliced) !== JSON.stringify(results[i + 3].sliced)
    )
      throw Error(`Reference image differs: brush ${i}`);
  }
  console.log(
    "PASS exact approved-reference curved artwork/Slice output and Undo; changed pixels:",
    results.map((r) => r.changed),
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
