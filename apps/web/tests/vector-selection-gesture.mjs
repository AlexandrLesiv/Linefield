import { panToRegionalOrigin } from "./vector-regional-navigation.mjs";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/selection-gesture";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
const origin = Number(process.env.LINEFIELD_PARITY_ORIGIN || 0);
if (!Number.isFinite(origin) || !Number.isInteger(origin) || BigInt(origin) % 196608n !== 0n)
  throw Error("Origin must preserve regional paper/grid periods");
try {
  for (const variant of ["previous", "shared"]) {
    for (let brush = 0; brush < 3; brush++) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(
        variant === "shared"
          ? process.env.LINEFIELD_PREVIEW_URL
          : process.env.LINEFIELD_BASELINE_URL,
      );
      await page.locator(".new-tile").click();
      const host = page.frameLocator("iframe");
      await host.locator("#brush").selectOption(String(brush));
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      if (variant === "shared" && origin) await panToRegionalOrigin(frame, origin);
      await host.locator("#pen").click();
      await frame.evaluate(() => {
        const canvas = document.querySelector("canvas"),
          rect = canvas.getBoundingClientRect();
        canvas.setPointerCapture = () => {};
        canvas.hasPointerCapture = () => true;
        canvas.releasePointerCapture = () => {};
        window.dragEvent = (type, x, y, shiftKey = false) =>
          canvas.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 901,
              pointerType: "pen",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure: 0.7,
              shiftKey,
              clientX: rect.left + x,
              clientY: rect.top + y,
            }),
          );
        for (let i = 0; i <= 40; i++)
          window.dragEvent(
            i ? "pointermove" : "pointerdown",
            300 + i * 5,
            300 + Math.sin(i / 10) * 30,
          );
        window.dragEvent("pointerup", 500, 300 + Math.sin(4) * 30);
      });
      const original = await captureDrawing(frame);
      await frame.evaluate(() => {
        document.querySelector("#select").click();
        document.querySelector("#selection-pick-mode").click();
        window.dragEvent("pointerdown", 300, 300);
        window.dragEvent("pointerup", 300, 300);
      });
      await captureDrawing(frame);
      const raw = await frame.evaluate(() =>
        Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
          String(lab.core.raw_region(0, i, 0)),
          String(lab.core.raw_region(0, i, 1)),
          lab.core.raw_local(0, i, 0),
          lab.core.raw_local(0, i, 1),
          lab.core.raw_point(0, i, 2),
        ]),
      );
      for (const [kind, amount, snap] of [
        ["rotate", 0.31, false],
        ["rotate", -0.41, true],
        ["rotate", 0.41, true],
        ["resize", 1.5, false],
        ["resize", 0.5, false],
      ]) {
        const transform = await frame.evaluate(
          ({ kind: mode, amount: value, snap: snapping }) => {
            if (lab.selection().length !== 1) throw Error("Selection missing");
            const corner = (i) => {
              const el = document.querySelector(`#selection-corner-${i}`);
              return [Number(el.getAttribute("x")) + 5, Number(el.getAttribute("y")) + 5];
            };
            const a = corner(0),
              b = corner(2);
            let start, end;
            if (mode === "rotate") {
              const h = document.querySelector("#selection-rotation-handle");
              start = [Number(h.getAttribute("cx")), Number(h.getAttribute("cy"))];
              const cx = (a[0] + b[0]) / 2,
                cy = (a[1] + b[1]) / 2;
              const dx = start[0] - cx,
                dy = start[1] - cy;
              end = [
                cx + dx * Math.cos(value) - dy * Math.sin(value),
                cy + dx * Math.sin(value) + dy * Math.cos(value),
              ];
            } else {
              start = a;
              end = [b[0] + (a[0] - b[0]) * value, b[1] + (a[1] - b[1]) * value];
            }
            window.dragEvent("pointerdown", ...start, snapping);
            window.dragEvent("pointermove", ...end, snapping);
            window.dragEvent("pointerup", ...end, snapping);
            return Array.from({ length: 4 }, (_, k) =>
              lab.core.stroke_transform_relative(
                0,
                k,
                BigInt(lab.viewOrigin()[0]),
                BigInt(lab.viewOrigin()[1]),
              ),
            );
          },
          { kind, amount, snap },
        );
        const pixels = await captureDrawing(frame);
        if (JSON.stringify(pixels) === JSON.stringify(original))
          throw Error("Transform had no visible effect");
        const unchanged = await frame.evaluate(
          (expectedRaw) =>
            JSON.stringify(expectedRaw) ===
            JSON.stringify(
              Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
                String(lab.core.raw_region(0, i, 0)),
                String(lab.core.raw_region(0, i, 1)),
                lab.core.raw_local(0, i, 0),
                lab.core.raw_local(0, i, 1),
                lab.core.raw_point(0, i, 2),
              ]),
            ),
          raw,
        );
        if (!unchanged) throw Error("Transform changed raw data");
        await host.locator("#undo").click();
        if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(original))
          throw Error("Transform Undo differs");
        await host.locator("#redo").click();
        if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(pixels))
          throw Error("Transform Redo differs");
        await host.locator("#undo").click();
        await captureDrawing(frame);
        results.push({
          origin: variant === "shared" ? origin : 0,
          variant,
          brush,
          kind,
          amount,
          snap,
          transform,
          pixels,
        });
      }
      if (errors.length) throw Error(errors.join("; "));
      await page.close();
    }
  }
  const prior = results.filter((r) => r.variant === "previous"),
    current = results.filter((r) => r.variant === "shared");
  for (let i = 0; i < prior.length; i++) {
    if (JSON.stringify(prior[i].pixels) !== JSON.stringify(current[i].pixels))
      throw Error(`Image mismatch ${i}`);
    if (prior[i].transform.some((v, k) => Math.abs(v - current[i].transform[k]) > 1e-12))
      throw Error(`Transform mismatch ${i}`);
  }
  console.log(
    "PASS actual handle rotation/snapping/resize, exact artwork, raw preservation and history across all brushes",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
