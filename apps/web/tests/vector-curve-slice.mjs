import { chromium } from "@playwright/test";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/curve-slice-reference";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const integrated of [false, true]) {
    for (let brush = 0; brush < 3; brush++) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: integrated ? 1000 : 948 },
        deviceScaleFactor: 2,
      });
      await page.goto(integrated ? "http://127.0.0.1:65325/" : "http://127.0.0.1:65280/");
      if (integrated) {
        await page.locator(".new-tile").click();
        await page.frameLocator("iframe").locator("#brush").waitFor();
      }
      const frame = integrated
        ? page.frames().find((f) => f.url().includes("/vector-editor/"))
        : page.mainFrame();
      await frame.waitForFunction(() => !!window.lab);
      await frame.locator("#brush").selectOption(String(brush));
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
      await frame.locator("#slice").click();
      await frame.locator("#slice-width-number").fill("0");
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
      results.push({
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
