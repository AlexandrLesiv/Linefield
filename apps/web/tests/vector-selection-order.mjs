import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/selection-order";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const url of [process.env.LINEFIELD_BASELINE_URL, process.env.LINEFIELD_PREVIEW_URL]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    await page.getByRole("button", { name: "New drawing", exact: true }).click();
    await page.frameLocator("iframe").locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    await frame.evaluate(() => {
      const canvas = document.querySelector("canvas"),
        r = canvas.getBoundingClientRect();
      canvas.setPointerCapture = () => {};
      canvas.hasPointerCapture = () => true;
      canvas.releasePointerCapture = () => {};
      window.orderEvent = (type, x, y, shiftKey = false) =>
        canvas.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 701,
            pointerType: "pen",
            button: 0,
            shiftKey,
            buttons: type === "pointerup" ? 0 : 1,
            pressure: 0.7,
            clientX: r.left + x,
            clientY: r.top + y,
          }),
        );
      for (let id = 0; id < 96; id++) {
        const x = 200 + (id % 12) * 60,
          y = 200 + Math.floor(id / 12) * 50;
        window.orderEvent("pointerdown", x, y);
        window.orderEvent("pointermove", x + 15, y);
        window.orderEvent("pointerup", x + 15, y);
      }
    });
    await captureDrawing(frame);
    const result = await frame.evaluate(() => {
      document.querySelector("#select").click();
      window.orderEvent("pointerdown", 150, 150);
      for (const p of [
        [950, 150],
        [950, 600],
        [150, 600],
        [150, 150],
      ])
        window.orderEvent("pointermove", ...p);
      window.orderEvent("pointerup", 150, 150);
      const initial = lab.selection();
      if (initial.length !== 96) throw Error("Lasso did not select 96 strokes");
      document.querySelector("#selection-pick-mode").click();
      const toggle = (id) => {
        const x = 207 + (id % 12) * 60,
          y = 200 + Math.floor(id / 12) * 50;
        window.orderEvent("pointerdown", x, y, true);
        window.orderEvent("pointerup", x, y, true);
      };
      for (let id = 0; id < 80; id++) toggle(id);
      const remaining = lab.selection();
      for (let id = 79; id >= 0; id--) toggle(id);
      const restored = lab.selection();
      const expected = initial
        .filter((id) => id >= 80)
        .concat(Array.from({ length: 80 }, (_, i) => 79 - i));
      if (
        JSON.stringify(remaining) !== JSON.stringify(initial.filter((id) => id >= 80)) ||
        JSON.stringify(restored) !== JSON.stringify(expected)
      )
        throw Error("Shift toggles changed insertion order");
      document.querySelector("#selection-clear").click();
      if (lab.selection().length) throw Error("Clear retained selection");
      toggle(95);
      return {
        initial,
        remaining,
        restored,
        raw: Array.from({ length: 96 }, (_, id) => lab.core.raw_length(id)),
      };
    });
    const selectedBeforeBack = await frame.evaluate(() => lab.selection());
    await page.getByRole("button", { name: "← Back", exact: true }).click();
    await page.getByRole("button", { name: "Resume temporary drawing", exact: true }).click();
    if (
      JSON.stringify(await frame.evaluate(() => lab.selection())) !==
      JSON.stringify(selectedBeforeBack)
    )
      throw Error("Back/Resume changed selected membership");
    if (errors.length) throw Error(errors.join("; "));
    results.push(result);
    await page.close();
  }
  if (JSON.stringify(results[0]) !== JSON.stringify(results[1]))
    throw Error("Selection order differs from prior application");
  console.log(
    "PASS 96-stroke selection, 160 Shift toggles, insertion-order preservation and clear",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
