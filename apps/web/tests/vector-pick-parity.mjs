import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/pick-parity";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const variant of repeat % 2 ? ["shared", "previous"] : ["previous", "shared"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        variant === "shared"
          ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65314/"
          : process.env.LINEFIELD_BASELINE_URL || "http://127.0.0.1:65313/",
      );
      await page.locator(".new-tile").click();
      await page.frameLocator("iframe").locator("#brush").waitFor();
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      await frame.evaluate(() => {
        const c = document.querySelector("canvas"),
          r = c.getBoundingClientRect();
        let captured = null;
        c.setPointerCapture = (id) => {
          captured = id;
        };
        c.hasPointerCapture = (id) => captured === id;
        c.releasePointerCapture = () => {
          captured = null;
        };
        window.pickEvent = (type, x, y) =>
          c.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 801,
              pointerType: "pen",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure: 0.7,
              clientX: r.left + x,
              clientY: r.top + y,
            }),
          );
        for (let brush = 0; brush < 3; brush++) {
          const control = document.querySelector("#brush");
          control.value = String(brush);
          control.dispatchEvent(new Event("change"));
          const width = document.querySelector("#width");
          width.value = "24";
          width.dispatchEvent(new Event("input"));
          for (let i = 0; i <= 1024; i++) {
            window.pickEvent(
              i ? "pointermove" : "pointerdown",
              180 + i * 0.8,
              200 + brush * 160 + Math.sin(i / 8) * 45,
            );
          }
          window.pickEvent("pointerup", 999.2, 200 + brush * 160 + Math.sin(128) * 45);
        }
      });
      await frame.waitForFunction(() => !lab.renderPending(), {}, { timeout: 30000 });
      const result = await frame.evaluate(() => {
        document.querySelector("#select").click();
        document.querySelector("#selection-pick-mode").click();
        const picks = [],
          elapsed = [];
        for (let brush = 0; brush < 3; brush++) {
          for (let i = 8; i < 1024; i += 24) {
            window.pickEvent("pointerdown", 30, 730);
            window.pickEvent("pointerup", 30, 730);
            const x = 180 + i * 0.8,
              y = 200 + brush * 160 + Math.sin(i / 8) * 45;
            const start = performance.now();
            window.pickEvent("pointerdown", x, y);
            window.pickEvent("pointerup", x, y);
            elapsed.push(performance.now() - start);
            picks.push(lab.selection());
          }
        }
        elapsed.sort((a, b) => a - b);
        return {
          picks,
          handlerMedianMs: elapsed[Math.floor(elapsed.length / 2)],
          handlerP95Ms: elapsed[Math.floor(elapsed.length * 0.95)],
          rawLengths: [0, 1, 2].map((id) => lab.core.raw_length(id)),
          userAgent: navigator.userAgent,
          dpr: devicePixelRatio,
        };
      });
      if (errors.length) throw Error(errors.join("; "));
      if (!result.picks.every((pick) => pick.length === 1))
        throw Error("Expected a stroke at every sampled centerline");
      results.push({ repeat, variant, ...result });
      await page.close();
    }
  }
  const baseline = JSON.stringify(results[0].picks);
  if (
    !results.every(
      (r) => JSON.stringify(r.picks) === baseline && r.rawLengths.every((n) => n === 1025),
    )
  )
    throw Error("Pick/raw parity changed");
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    "Passed actual-input retained-geometry Pick parity",
    results.map(({ repeat, variant, handlerMedianMs, handlerP95Ms }) => ({
      repeat,
      variant,
      handlerMedianMs,
      handlerP95Ms,
    })),
  );
} finally {
  await browser.close();
}
