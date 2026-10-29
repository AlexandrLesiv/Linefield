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
          let canonical = null;
          if (typeof lab.core.raw_region === "function") {
            const read = () =>
              Array.from({ length: lab.core.raw_length(0) }, (_, i) =>
                [0, 1].map((axis) => ({
                  region: String(lab.core.raw_region(0, i, axis)),
                  local: lab.core.raw_local(0, i, axis),
                })),
              );
            const addresses = read();
            const sourceUnique = new Set(
              Array.from({ length: lab.core.raw_length(0) }, (_, i) => lab.core.point(0, i, 0)),
            ).size;
            if (sourceUnique !== 65) throw Error("Source geometry collapsed before placement");
            const count = lab.core.render_chunk(0, 0, 0.1);
            const direct = new Float32Array(
              lab.core.memory.buffer,
              lab.core.render_chunk_ptr(),
              count * 6,
            ).slice();
            const length = lab.core.geometry_snapshot(0, 0);
            const derivedCount = lab.core.render_snapshot(length, 0.1);
            const derived = new Float32Array(
              lab.core.memory.buffer,
              lab.core.render_chunk_ptr(),
              derivedCount * 6,
            ).slice();
            if (JSON.stringify([...direct]) !== JSON.stringify([...derived]))
              throw Error("Anchored worker snapshot differs from owning engine geometry");
            const beforeTransform = [0, 1, 2, 3].map((k) => lab.core.stroke_transform(0, k));
            lab.core.move_begin();
            if (!lab.core.move_add(0) || !lab.core.move_update(0.125, 0.25))
              throw Error("Anchored stroke move rejected");
            lab.core.move_commit();
            const moved = [0, 1, 2, 3].map((k) => lab.core.stroke_transform(0, k));
            if (moved[2] !== beforeTransform[2] + 0.125 || moved[3] !== beforeTransform[3] + 0.25)
              throw Error("Anchored placement lost bounded movement");
            lab.core.undo();
            if (
              JSON.stringify([0, 1, 2, 3].map((k) => lab.core.stroke_transform(0, k))) !==
              JSON.stringify(beforeTransform)
            )
              throw Error("Anchored movement Undo failed");
            lab.core.redo();
            if (
              JSON.stringify([0, 1, 2, 3].map((k) => lab.core.stroke_transform(0, k))) !==
              JSON.stringify(moved)
            )
              throw Error("Anchored movement Redo failed");
            lab.core.undo();
            document.querySelector("#undo").click();
            document.querySelector("#redo").click();
            if (JSON.stringify(addresses) !== JSON.stringify(read()))
              throw Error("History changed canonical addresses");
            // This bounded audit uses origins <= 2^32, exactly representable in f64.
            // Production transport must keep arbitrary region/local pairs separate.
            const positions = addresses.map((pair) =>
              pair.map((p) => Number(BigInt(p.region)) * 65536 + p.local),
            );
            const screenError =
              Math.max(
                ...positions.map((p, i) =>
                  Math.max(Math.abs(p[0] - expected[i][0]), Math.abs(p[1] - expected[i][1])),
                ),
              ) * view.zoom;
            canonical = {
              addresses,
              sourceUnique,
              snapshotMatches: true,
              unique: new Set(positions.map((p) => p[0])).size,
              screenError,
              sampleBytes: lab.core.canonical_sample_bytes(),
            };
            if (canonical.unique !== 65 || screenError !== 0)
              throw Error("Canonical input lost precision");
          }
          if (canonical) {
            const acceptedBefore = lab.metrics.accepted;
            send("pointerdown", 200, 400);
            send("pointermove", 1e30, 400);
            send("pointerup", 220, 400);
            if (
              lab.core.count() !== 2 ||
              lab.core.raw_length(1) !== 2 ||
              lab.metrics.accepted !== acceptedBefore + 2
            )
              throw Error("Invalid input lost accepted samples or polluted accepted counts");
          }
          return {
            canonical,
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
        "canonical",
        measurement.canonical && {
          unique: measurement.canonical.unique,
          screenError: measurement.canonical.screenError,
        },
      );
    }
} finally {
  await browser.close();
}
