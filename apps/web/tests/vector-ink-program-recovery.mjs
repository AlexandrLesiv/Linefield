import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/ink-program-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const fault of ["compile", "link"]) {
    const page = await browser.newPage();
    await page.addInitScript((mode) => {
      const prototype = WebGL2RenderingContext.prototype;
      const inkShaders = new Set();
      const inkPrograms = new Set();
      let lastProgram;
      const state = { injected: false, deletedShaders: 0, deletedPrograms: 0, attached: -1 };
      window.inkProgramEvidence = state;
      for (const method of [
        "createProgram",
        "shaderSource",
        "attachShader",
        "getShaderParameter",
        "getProgramParameter",
        "deleteShader",
        "deleteProgram",
        "useProgram",
      ]) {
        const original = prototype[method];
        prototype[method] = function (...args) {
          if (method === "shaderSource" && args[1].includes("uniform int routeCount;")) {
            inkShaders.add(args[0]);
            inkPrograms.add(lastProgram);
          }
          if (method === "attachShader" && inkShaders.has(args[1])) inkPrograms.add(args[0]);
          const faultCall =
            mode === "compile"
              ? method === "getShaderParameter" &&
                inkShaders.has(args[0]) &&
                args[1] === this.COMPILE_STATUS
              : method === "getProgramParameter" &&
                inkPrograms.has(args[0]) &&
                args[1] === this.LINK_STATUS;
          if (faultCall && !sessionStorage.getItem(`ink-fault-${mode}`)) {
            sessionStorage.setItem(`ink-fault-${mode}`, "1");
            state.injected = true;
            return false;
          }
          if (method === "deleteShader" && inkShaders.has(args[0])) state.deletedShaders++;
          if (method === "deleteProgram" && inkPrograms.has(args[0])) state.deletedPrograms++;
          if (method === "useProgram" && inkPrograms.has(args[0]))
            state.attached = this.getAttachedShaders(args[0]).length;
          const result = original.apply(this, args);
          if (method === "createProgram") lastProgram = result;
          return result;
        };
      }
    }, fault);
    await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65305/");
    await page.locator(".new-tile").click();
    const host = page.frameLocator("iframe");
    await host.locator("#status").filter({ hasText: "Drawing could not start" }).waitFor();
    let frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
    const failure = await frame.evaluate(() => window.inkProgramEvidence);
    if (!failure.injected || failure.deletedShaders !== 1 || failure.deletedPrograms !== 1)
      throw Error(`Failed ${fault} cleanup: ${JSON.stringify(failure)}`);
    await host.getByRole("button", { name: "Retry", exact: true }).click();
    frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
    await frame.waitForFunction(() => !!window.lab);
    const box = await host.locator("canvas").boundingBox();
    await page.mouse.move(box.x + 200, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 500, box.y + 300, { steps: 20 });
    await page.mouse.up();
    await frame.waitForFunction(() => !window.lab.renderPending());
    const recovery = await frame.evaluate(() => ({
      ...window.inkProgramEvidence,
      count: window.lab.core.count(),
    }));
    if (recovery.count !== 1 || recovery.attached !== 0)
      throw Error(`Failed ${fault} recovery: ${JSON.stringify(recovery)}`);
    results.push({ fault, failure, recovery });
    await page.close();
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    "PASS ink compile/link failure cleanup, Retry, drawing and detached shader resources",
  );
} finally {
  await browser.close();
}
