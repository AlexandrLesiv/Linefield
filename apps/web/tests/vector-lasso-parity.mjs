import { captureDrawing } from "./vector-drawing-capture.mjs";
import { panToRegionalOrigin } from "./vector-regional-navigation.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/lasso-parity";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const regionalOrigin = Number(process.env.LINEFIELD_PARITY_ORIGIN || 0);
if (
  !Number.isFinite(regionalOrigin) ||
  !Number.isInteger(regionalOrigin) ||
  BigInt(regionalOrigin) % 196608n !== 0n
)
  throw Error("Origin must preserve regional grid periods");
try {
  for (let brush = 0; brush < 3; brush++) {
    for (const variant of brush % 2 ? ["shared", "previous"] : ["previous", "shared"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        variant === "shared"
          ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65315/"
          : process.env.LINEFIELD_BASELINE_URL || "http://127.0.0.1:65314/",
      );
      await page.locator(".new-tile").click();
      await page.frameLocator("iframe").locator("#brush").waitFor();
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      if (variant === "shared" && regionalOrigin) await panToRegionalOrigin(frame, regionalOrigin);
      await frame.evaluate((brushId) => {
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
        window.lassoEvent = (type, x, y) =>
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
        document.querySelector("#pen").click();
        const control = document.querySelector("#brush");
        control.value = String(brushId);
        control.dispatchEvent(new Event("change"));
        const width = document.querySelector("#width");
        width.value = "12";
        width.dispatchEvent(new Event("input"));
        for (let stroke = 0; stroke < 3; stroke++) {
          for (let i = 0; i <= 400; i++)
            window.lassoEvent(i ? "pointermove" : "pointerdown", 200 + i, 200 + stroke * 100);
          window.lassoEvent("pointerup", 600, 200 + stroke * 100);
        }
      }, brush);
      await frame.waitForFunction(() => !lab.renderPending(), {}, { timeout: 30000 });
      const result = await frame.evaluate(async (transformSelection) => {
        document.querySelector("#select").click();
        document.querySelector("#selection-lasso-mode").click();
        const outer = [
          [100, 100],
          [700, 100],
          [700, 500],
          [100, 500],
          [100, 100],
        ];
        const dense = [];
        for (let e = 0; e < 4; e++)
          for (let i = 0; i < 320; i++)
            dense.push([
              outer[e][0] + ((outer[e + 1][0] - outer[e][0]) * i) / 320,
              outer[e][1] + ((outer[e + 1][1] - outer[e][1]) * i) / 320,
            ]);
        const paths = [
          outer,
          [
            [150, 260],
            [650, 260],
            [650, 340],
            [150, 340],
            [150, 260],
          ],
          [
            [400, 150],
            [400, 450],
          ],
          [
            [100, 100],
            [700, 100],
            [700, 500],
            [500, 500],
            [500, 250],
            [300, 250],
            [300, 500],
            [100, 500],
            [100, 100],
          ],
          [
            [100, 100],
            [700, 500],
            [100, 500],
            [700, 100],
            [100, 100],
          ],
          dense,
        ];
        const raw = () =>
          [0, 1, 2].map((id) =>
            Array.from({ length: lab.core.raw_length(id) }, (_, i) => [
              ...[0, 1].map((axis) => [
                String(lab.core.raw_region(id, i, axis)),
                lab.core.raw_local(id, i, axis),
              ]),
              lab.core.raw_point(id, i, 2),
            ]),
          );
        const original = JSON.stringify(raw());
        const paint = () =>
          new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        if (transformSelection) {
          // Select all with actual input, move the group, then rotate using its handle.
          window.lassoEvent("pointerdown", ...outer[0]);
          for (const p of outer.slice(1)) window.lassoEvent("pointermove", ...p);
          window.lassoEvent("pointerup", ...outer.at(-1));
          await paint();
          if (lab.selection().length !== 3) throw Error("Transform setup failed to select all");
          window.lassoEvent("pointerdown", 400, 300);
          window.lassoEvent("pointermove", 440, 320);
          window.lassoEvent("pointerup", 440, 320);
          await paint();
          const handle = document.querySelector("#selection-rotation-handle");
          const x = Number(handle.getAttribute("cx")),
            y = Number(handle.getAttribute("cy"));
          const dx = x - 440,
            dy = y - 320,
            angle = Math.PI / 12;
          window.lassoEvent("pointerdown", x, y);
          window.lassoEvent(
            "pointermove",
            440 + dx * Math.cos(angle) - dy * Math.sin(angle),
            320 + dx * Math.sin(angle) + dy * Math.cos(angle),
          );
          window.lassoEvent(
            "pointerup",
            440 + dx * Math.cos(angle) - dy * Math.sin(angle),
            320 + dx * Math.sin(angle) + dy * Math.cos(angle),
          );
          await paint();
          if (JSON.stringify(raw()) !== original)
            throw Error("Transform changed canonical raw samples");
          if (
            ![0, 1, 2].every(
              (id) =>
                Math.abs(
                  lab.core.stroke_transform_relative(
                    id,
                    1,
                    BigInt(lab.viewOrigin()[0]),
                    BigInt(lab.viewOrigin()[1]),
                  ),
                ) > 0.1,
            )
          )
            throw Error("Rotation was not exercised");
        }
        const queries = [];
        for (let repeat = 0; repeat < 3; repeat++)
          for (const partial of [true, false])
            for (let shape = 0; shape < paths.length; shape++) {
              document.querySelector("#selection-clear").click();
              document.querySelector("#selection-partial").checked = partial;
              const path = paths[shape];
              window.lassoEvent("pointerdown", ...path[0]);
              for (const p of path.slice(1)) window.lassoEvent("pointermove", ...p);
              const start = performance.now();
              window.lassoEvent("pointerup", ...path.at(-1));
              queries.push({
                repeat,
                partial,
                shape,
                ids: lab.selection(),
                completionHandlerMs: performance.now() - start,
              });
            }
        return {
          queries,
          viewOrigin: lab.viewOrigin(),
          transformed: transformSelection,
          rawLengths: [0, 1, 2].map((id) => lab.core.raw_length(id)),
          userAgent: navigator.userAgent,
          dpr: devicePixelRatio,
        };
      }, process.env.LINEFIELD_SELECTION_TRANSFORM === "1");
      if (errors.length) throw Error(errors.join("; "));
      if (result.queries.some((q) => q.shape === 0 && JSON.stringify(q.ids) !== "[0,1,2]"))
        throw Error("Outer lasso did not select all strokes");
      const artwork =
        process.env.LINEFIELD_COMPARE_SELECTION_PIXELS === "1"
          ? await captureDrawing(frame)
          : undefined;
      results.push({ brush, variant, ...result, artwork });
      await page.close();
    }
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  for (let brush = 0; brush < 3; brush++) {
    const pair = results.filter((r) => r.brush === brush);
    if (
      JSON.stringify(pair[0].artwork) !== JSON.stringify(pair[1].artwork) ||
      JSON.stringify(pair[0].queries.map((q) => q.ids)) !==
        JSON.stringify(pair[1].queries.map((q) => q.ids)) ||
      pair.some((r) => r.rawLengths.some((n) => n !== 401))
    )
      throw Error("Lasso identity, artwork or raw preservation mismatch");
  }
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(
    "PASS actual-input Lasso parity: three brushes, six shapes, both containment modes, three repeats",
  );
} finally {
  await browser.close();
}
