import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { installLassoFault, drawLassoScene } from "./vector-lasso-worker-faults.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/lasso-pending-ui";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }),
  results = [];
try {
  for (const locale of ["en-US", "uk-UA"]) {
    const page = await browser.newPage({
      locale,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(installLassoFault, "hold-clear");
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65346");
    await page.locator(".new-tile").click();
    await page.frameLocator("iframe").locator("#brush").waitFor();
    const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    await page.setViewportSize({ width: 390, height: 844 });
    await drawLassoScene(frame);
    await frame.evaluate(() => window.queryLasso());
    const expected = locale === "en-US" ? "Updating selection…" : "Оновлення вибору…";
    await frame.waitForFunction(
      (text) => document.querySelector("#selection-status").textContent === text,
      expected,
    );
    const pending = await frame.evaluate(() => ({
      loop: !!document.querySelector("#selection-lasso").getAttribute("d"),
      focus: document.activeElement === document.querySelector("canvas"),
      ids: lab.selection(),
    }));
    if (!pending.loop || !pending.focus || pending.ids.length)
      throw Error("Pending presentation changed selection/focus");
    await page.screenshot({ path: `${output}/${locale}.png` });
    await frame.evaluate(() => {
      document.querySelector("#selection-clear").click();
      for (const deliver of window.lassoFault.held) deliver();
    });
    await frame.waitForFunction(
      () =>
        !lab.lassoWorker().pending && !document.querySelector("#selection-lasso").getAttribute("d"),
    );
    if (errors.length) throw Error(errors.join("\n"));
    results.push({ locale, ...pending, cancelCleared: true });
    await page.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log("PASS pending UI EN/UK narrow reduced-motion");
} finally {
  await browser.close();
}
