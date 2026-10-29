import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/coordinate-audit";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const results = [];
try {
  for (const integrated of [false, true])
    for (const origin of [0, 65536, 1048576, 4294967296]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: integrated ? 1000 : 948 },
        deviceScaleFactor: 2,
      });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(
        integrated
          ? process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65289/"
          : process.env.LINEFIELD_REFERENCE_URL || "http://127.0.0.1:65280/",
      );
      if (integrated) await page.locator(".new-tile").click();
      const host = integrated ? page.frameLocator("iframe") : page;
      await host.locator("#brush").waitFor();
      const frame = integrated
        ? page.frames().find((candidate) => candidate.url().includes("/vector-editor/"))
        : page.mainFrame();
      await frame.waitForFunction(() => !!window.lab);
      const measurement = await frame.evaluate((documentOrigin) => {
        const canvas = document.querySelector("canvas"),
          r = canvas.getBoundingClientRect();
        const names = ["setPointerCapture", "hasPointerCapture", "releasePointerCapture"];
        const descriptors = names.map((name) => Object.getOwnPropertyDescriptor(canvas, name));
        let captured = false;
        canvas.setPointerCapture = () => {
          captured = true;
        };
        canvas.hasPointerCapture = () => captured;
        canvas.releasePointerCapture = () => {
          captured = false;
        };
        const send = (type, x, y) =>
          canvas.dispatchEvent(
            new PointerEvent(type, {
              bubbles: true,
              pointerId: 311,
              pointerType: "pen",
              button: 0,
              buttons: type === "pointerup" ? 0 : 1,
              pressure: 0.7,
              clientX: r.x + x,
              clientY: r.y + y,
            }),
          );
        try {
          canvas.dispatchEvent(
            new WheelEvent("wheel", {
              bubbles: true,
              cancelable: true,
              clientX: r.x,
              clientY: r.y,
              deltaY: -Math.log(16) / 0.001,
            }),
          );
          document.querySelector("#pan").click();
          send("pointerdown", 100, 100);
          send("pointermove", 100 - documentOrigin * 16, 100);
          send("pointerup", 100 - documentOrigin * 16, 100);
          document.querySelector("#pen").click();
          const view = lab.view(),
            expected = [];
          for (let i = 0; i <= 64; i++) {
            const x = 200 + i,
              y = 300;
            expected.push([(x - view.cx) / view.zoom, (y - view.cy) / view.zoom]);
            send(i === 0 ? "pointerdown" : "pointermove", x, y);
          }
          send("pointerup", 264, 300);
          const actual = Array.from({ length: lab.core.raw_length(0) }, (_, i) => [
            lab.core.raw_point(0, i, 0),
            lab.core.raw_point(0, i, 1),
          ]);
          const maxError = Math.max(
            ...actual.map((p, i) =>
              Math.max(
                Math.abs(p[0] - expected[Math.min(i, 64)][0]),
                Math.abs(p[1] - expected[Math.min(i, 64)][1]),
              ),
            ),
          );
          return {
            view,
            expected,
            actual,
            expectedUnique: new Set(expected.map((p) => p[0])).size,
            actualUnique: new Set(actual.map((p) => p[0])).size,
            maxCoordinateError: maxError,
            maxScreenError: maxError * view.zoom,
          };
        } finally {
          names.forEach((name, i) =>
            descriptors[i]
              ? Object.defineProperty(canvas, name, descriptors[i])
              : delete canvas[name],
          );
        }
      }, origin);
      results.push({ integrated, origin, measurement, errors });
      await page.close();
      await writeFile(
        `${output}/results.json`,
        JSON.stringify(
          { browser: browser.version(), dpr: 2, kind: "audit-not-an-acceptance-pass", results },
          null,
          2,
        ),
      );
      console.log(
        integrated ? "integrated" : "reference",
        origin,
        "unique",
        measurement.actualUnique,
        "/",
        measurement.expectedUnique,
        "screen error",
        measurement.maxScreenError,
      );
    }
} finally {
  await browser.close();
}
