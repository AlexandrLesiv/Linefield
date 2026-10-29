import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/rotated-rebase";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const brush of [0, 1, 2])
    for (const zoom of [0.125, 8]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(process.env.LINEFIELD_PREVIEW_URL);
      await page.locator(".new-tile").click();
      const host = page.frameLocator("iframe");
      await host.locator("#brush").waitFor();
      await host.locator("#brush").selectOption(String(brush));
      const frame = page.frames().find((f) => f.url().includes("/vector-editor/"));
      await frame.waitForFunction(() => !!window.lab);
      await frame.evaluate((scale) => {
        const canvas = document.querySelector("canvas"),
          r = canvas.getBoundingClientRect();
        canvas.dispatchEvent(
          new WheelEvent("wheel", {
            bubbles: true,
            cancelable: true,
            clientX: r.x + 400,
            clientY: r.y + 300,
            deltaY: -Math.log(scale) / 0.001,
          }),
        );
        canvas.setPointerCapture = () => {};
        canvas.hasPointerCapture = () => true;
        canvas.releasePointerCapture = () => {};
        window.rebasePointer = (type, x, y) =>
          canvas.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 811,
              pointerType: "pen",
              button: 0,
              pressure: 0.7,
              buttons: type === "pointerup" ? 0 : 1,
              clientX: r.x + x,
              clientY: r.y + y,
            }),
          );
        const cx = r.width / 2,
          cy = r.height / 2;
        document.querySelector("#rotate").click();
        rebasePointer("pointerdown", cx + 200, cy);
        rebasePointer("pointermove", cx + 200 * Math.cos(0.31), cy + 200 * Math.sin(0.31));
        rebasePointer("pointerup", cx + 200 * Math.cos(0.31), cy + 200 * Math.sin(0.31));
        document.querySelector("#pen").click();
        for (let i = 0; i < 385; i++)
          rebasePointer(i ? "pointermove" : "pointerdown", 200 + i, 300 + 40 * Math.sin(i / 24));
        rebasePointer("pointerup", 584, 300 + 40 * Math.sin(384 / 24));
      }, zoom);
      const detail = process.env.LINEFIELD_REBASE_PIXELS === "1";
      const originalCapture = await captureDrawing(frame, null, detail);
      const original = detail ? originalCapture.hash : originalCapture;
      const initialView = await frame.evaluate(() => ({
        view: lab.view(),
        origin: lab.viewOrigin(),
      }));
      const raw = () =>
        frame.evaluate(() =>
          Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
            String(lab.core.raw_region(0, i, 0)),
            String(lab.core.raw_region(0, i, 1)),
            lab.core.raw_local(0, i, 0),
            lab.core.raw_local(0, i, 1),
            lab.core.raw_point(0, i, 2),
          ]),
        );
      const samples = await raw();
      const origins = [];
      for (const sign of [1, -1]) {
        await frame.evaluate((direction) => {
          const view = lab.view(),
            c = Math.cos(view.rotation),
            s = Math.sin(view.rotation);
          const x = direction * view.zoom * (c * 1048576 - s * 524288);
          const y = direction * view.zoom * (s * 1048576 + c * 524288);
          document.querySelector("#pan").click();
          rebasePointer("pointerdown", 200, 200);
          rebasePointer("pointermove", 200 - x, 200 - y);
          // Keep the return pan held while checking the accurate reprojected image.
          if (direction === 1) rebasePointer("pointerup", 200 - x, 200 - y);
        }, sign);
        await frame.waitForFunction(() => !lab.renderPending());
        origins.push(await frame.evaluate(() => lab.viewOrigin()));
      }
      const returned = await captureDrawing(frame, null, detail);
      if (JSON.stringify(detail ? returned.hash : returned) !== JSON.stringify(original)) {
        let changed = 0,
          maximum = 0;
        for (let i = 0; i < (returned.pixels?.length || 0); i += 4) {
          const d = Math.max(
            ...returned.pixels
              .slice(i, i + 4)
              .map((v, k) => Math.abs(v - originalCapture.pixels[i + k])),
          );
          if (d) changed++;
          maximum = Math.max(maximum, d);
        }
        results.push({
          brush,
          zoom,
          changed: detail ? changed : null,
          maximum: detail ? maximum : null,
          initialView,
          returnedView: await frame.evaluate(() => ({
            view: lab.view(),
            origin: lab.viewOrigin(),
          })),
          origins,
        });
        throw Error(
          `Held return image differs: ${brush}/${zoom}, pixels=${detail ? changed : "not captured"}, max=${detail ? maximum : "not captured"}`,
        );
      }
      await frame.evaluate(() => rebasePointer("pointerup", 200, 200));
      if (JSON.stringify(await captureDrawing(frame)) !== JSON.stringify(original))
        throw Error("Release changed image");
      if (JSON.stringify(await raw()) !== JSON.stringify(samples) || errors.length)
        throw Error("Raw/error mismatch");
      if (origins[0].every((v, i) => v === origins[1][i]))
        throw Error("No regional crossing exercised");
      results.push({
        brush,
        zoom,
        origins,
        exactHeldAndReleased: true,
        rawPreserved: true,
        errors,
      });
      await page.close();
    }
  console.log(
    "PASS all brushes: rotated low/high-zoom regional crossing, exact held/released return and raw preservation",
  );
} finally {
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
