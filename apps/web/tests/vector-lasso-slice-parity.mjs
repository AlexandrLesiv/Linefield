import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
import { installLassoFault, drawLassoScene } from "./vector-lasso-worker-faults.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/lasso-slice-parity";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (let brush = 0; brush < 3; brush++)
    for (const variant of ["baseline", "candidate"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(installLassoFault, "normal");
      await page.goto(
        variant === "baseline"
          ? "http://127.0.0.1:65341"
          : process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65346",
      );
      await page.locator(".new-tile").click();
      await page.frameLocator("iframe").locator("#brush").selectOption(String(brush));
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      await drawLassoScene(frame);
      for (const width of [0, 20]) {
        await frame.evaluate((w) => {
          document.querySelector("#selection-clear").click();
          document.querySelector("#slice").click();
          const input = document.querySelector("#slice-width");
          input.value = String(w);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          window.lassoEvent("pointerdown", 300, 100);
          window.lassoEvent("pointermove", 300, 450);
          window.lassoEvent("pointerup", 300, 450);
        }, width);
        const image = await captureDrawing(frame),
          queries = [];
        for (const partial of [false, true]) {
          await frame.evaluate((p) => {
            document.querySelector("#select").click();
            document.querySelector("#selection-clear").click();
            document.querySelector("#selection-partial").checked = p;
            window.queryLasso();
          }, partial);
          await frame.waitForFunction(() => !lab.lassoWorker?.().pending);
          queries.push(await frame.evaluate(() => lab.selection()));
          if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(image))
            throw Error("Lasso altered sliced drawing");
        }
        const raw = await frame.evaluate(() => window.rawLasso());
        const row = { brush, variant, width, image, queries, raw };
        if (variant === "candidate") {
          const reference = results.find(
            (r) => r.brush === brush && r.width === width && r.variant === "baseline",
          );
          if (JSON.stringify({ ...row, variant: "baseline" }) !== JSON.stringify(reference))
            throw Error("Sliced Lasso parity failure");
        }
        results.push(row);
        await frame.evaluate(() => document.querySelector("#undo").click());
        await captureDrawing(frame);
      }
      if (errors.length) throw Error(errors.join("\n"));
      await page.close();
    }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log("PASS Lasso on zero/positive Slice fragments all brushes");
} finally {
  await browser.close();
}
