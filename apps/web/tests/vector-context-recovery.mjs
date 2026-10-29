import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/context-recovery";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const rows = [];
try {
  for (const brush of [0, 1, 2])
    for (const failures of [0, 1, 3, 4]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(process.env.LINEFIELD_PREVIEW_URL);
      await page.locator(".new-tile").click();
      const host = page.frameLocator("iframe");
      await host.locator("#brush").selectOption(String(brush));
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      const box = await host.locator("canvas").boundingBox();
      await page.mouse.move(box.x + 200, box.y + 250);
      await page.mouse.down();
      await page.mouse.move(box.x + 500, box.y + 250, { steps: 24 });
      await page.mouse.up();
      const original = await captureDrawing(frame);
      await frame.evaluate((failureCount) => {
        const canvas = document.querySelector("canvas"),
          gl = canvas.getContext("webgl2");
        const raw = () =>
          Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
            String(lab.core.raw_region(0, i, 0)),
            String(lab.core.raw_region(0, i, 1)),
            lab.core.raw_local(0, i, 0),
            lab.core.raw_local(0, i, 1),
            lab.core.raw_point(0, i, 2),
          ]);
        const state = (window.restoreProbe = {
          lost: false,
          restored: false,
          hits: 0,
          core: lab.core,
          raw: JSON.stringify(raw()),
          rawNow: raw,
          allocated: new Set(),
          deleted: new Set(),
          failedResources: [],
          programCalls: 0,
        });
        canvas.addEventListener("webglcontextlost", () => (state.lost = true));
        canvas.addEventListener("webglcontextrestored", () => (state.restored = true));
        for (const kind of [
          "Buffer",
          "Texture",
          "Framebuffer",
          "Renderbuffer",
          "VertexArray",
          "Program",
          "Shader",
          "Query",
          "Sampler",
          "TransformFeedback",
        ]) {
          const create = gl[`create${kind}`].bind(gl),
            remove = gl[`delete${kind}`].bind(gl);
          gl[`create${kind}`] = (...args) => {
            if (
              state.lost &&
              kind === "Program" &&
              ++state.programCalls % 3 === 0 &&
              state.hits < failureCount
            ) {
              state.hits++;
              state.failedResources.push([...state.allocated]);
              return null;
            }
            const resource = create(...args);
            if (state.lost && resource) state.allocated.add(resource);
            return resource;
          };
          gl[`delete${kind}`] = (resource) => {
            state.deleted.add(resource);
            return remove(resource);
          };
        }
        state.createProgram = gl.createProgram;
        window.lose = gl.getExtension("WEBGL_lose_context");
        if (!lose) throw Error("Context-loss extension unavailable");
        lose.loseContext();
      }, failures);
      await frame.waitForFunction(() => restoreProbe.lost);
      await frame.evaluate(() => lose.restoreContext());
      await frame.waitForFunction(() => restoreProbe.restored);
      if (failures >= 3) {
        await host.locator("#renderer-retry").waitFor({ state: "visible" });
        const stopped = await frame.evaluate(() => ({
          hits: restoreProbe.hits,
          pending: lab.renderPending(),
        }));
        if (stopped.hits !== 3 || !stopped.pending)
          throw Error("Automatic retries were not bounded");
        await host.locator("#renderer-retry").click();
      }
      await frame.waitForFunction(() => !lab.renderPending(), null, { timeout: 10000 });
      if (
        failures >= 3 &&
        !(await frame.evaluate(() => document.activeElement === document.querySelector("canvas")))
      )
        throw Error("Manual retry focus was lost across automatic retries");
      const recovered = await captureDrawing(frame);
      await host.locator("#undo").click();
      await frame.waitForFunction(() => !lab.renderPending());
      if (await frame.evaluate(() => lab.core.visible(0)))
        throw Error("Undo after recovery failed");
      await host.locator("#redo").click();
      const redone = await captureDrawing(frame);
      const result = await frame.evaluate(() => ({
        sameEngine: restoreProbe.core === lab.core,
        rawPreserved: restoreProbe.raw === JSON.stringify(restoreProbe.rawNow()),
        hits: restoreProbe.hits,
        partialAllocationsDeleted: restoreProbe.failedResources.every((batch) =>
          batch.every((r) => restoreProbe.deleted.has(r)),
        ),
        wrapperRestored:
          document.querySelector("canvas").getContext("webgl2").createProgram ===
          restoreProbe.createProgram,
        retryHidden: document.querySelector("#renderer-retry").hidden,
      }));
      const exact =
        JSON.stringify(original) === JSON.stringify(recovered) &&
        JSON.stringify(original) === JSON.stringify(redone);
      rows.push({ brush, failures, ...result, exact, errors });
      if (
        !exact ||
        !result.sameEngine ||
        !result.rawPreserved ||
        result.hits !== failures ||
        !result.partialAllocationsDeleted ||
        !result.wrapperRestored ||
        !result.retryHidden ||
        errors.length
      )
        throw Error("Context reconstruction recovery failed");
      await page.close();
    }
  console.log(
    "PASS all brushes: clean restore, transient/three failed reconstructions, rollback, bounded retries, same engine/raw and exact image/history recovery",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(rows, null, 2));
  await browser.close();
}
