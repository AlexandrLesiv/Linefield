import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

// Diagnostic, not an acceptance pass: retain unresolved geometry loss explicitly.
const output = process.env.LINEFIELD_EVIDENCE_DIR || ".build-cache/restart/long-source-audit";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.LINEFIELD_PREVIEW_URL || "http://127.0.0.1:65307/");
  await page.locator(".new-tile").click();
  await page.frameLocator("iframe").locator("#brush").waitFor();
  const frame = page.frames().find((item) => item.url().includes("/vector-editor/"));
  await frame.waitForFunction(() => !!window.lab);
  const cases = await frame.evaluate(() => {
    const core = lab.core;
    const placement = (id, chunk, component, rx, ry) =>
      typeof core.chunk_transform_relative === "function"
        ? core.chunk_transform_relative(id, chunk, component, rx, ry)
        : core.stroke_transform_relative(id, component, rx, ry);
    const result = [];
    const wide = (id, chunk) =>
      typeof core.geometry_requires_f64 === "function" &&
      core.geometry_requires_f64(id, chunk) !== 0;
    const render = (id, chunk) => {
      const useWide = wide(id, chunk),
        count = useWide
          ? core.render_chunk_f64(id, chunk, 0.0001)
          : core.render_chunk(id, chunk, 0.0001);
      return useWide
        ? new Float64Array(core.memory.buffer, core.render_chunk_f64_ptr(), count * 6).slice()
        : new Float32Array(core.memory.buffer, core.render_chunk_ptr(), count * 6).slice();
    };
    // One source starts near zero, then contains a fine tail in a later region.
    // A compact source at that same region is the translation-invariant control.
    for (const extent of [0, 65536, 1048576, 16777216, 4294967296]) {
      for (const axis of [0, 1]) {
        for (const compact of [false, true]) {
          const id = core.begin_fixed_width(0.25, 0, 1);
          const points = Array.from({ length: 385 }, (_, i) => {
            const along = (compact || i > 0 ? extent : 0.125) + i / 16;
            return axis === 0 ? [along, 100] : [100, along];
          });
          for (const [x, y] of points)
            if (!core.push_precise(x, y, 0.75)) throw Error("Sample rejected");
          core.commit();
          const raw = () =>
            points.map((_, i) =>
              [0, 1].map(
                (a) => Number(core.raw_region(id, i, a)) * 65536 + core.raw_local(id, i, a),
              ),
            );
          const canonicalEqual = JSON.stringify(points) === JSON.stringify(raw());
          core.undo();
          core.redo();
          if (!canonicalEqual || JSON.stringify(points) !== JSON.stringify(raw()))
            throw Error("Canonical sample/history mismatch");
          const source = points.slice(256, 384).map((_, i) => core.point(id, i + 256, axis));
          const firstData = render(id, 0).slice(0, 3);
          const firstPlacement = placement(id, 0, axis + 2, 0n, 0n);
          const firstProjected = firstData[axis] + firstPlacement;
          const firstPrecise = firstProjected === points[0][axis];
          const direct = render(id, 2),
            count = direct.length / 6;
          const useWide = wide(id, 2);
          const size = useWide ? core.geometry_snapshot_f64(id, 2) : core.geometry_snapshot(id, 2);
          const prepared = useWide
            ? core.render_snapshot_f64(size, 0.0001)
            : core.render_snapshot(size, 0.0001);
          const copied = useWide
            ? new Float64Array(
                core.memory.buffer,
                core.render_chunk_f64_ptr(),
                prepared * 6,
              ).slice()
            : new Float32Array(core.memory.buffer, core.render_chunk_ptr(), prepared * 6).slice();
          const workerEqual = JSON.stringify([...direct]) === JSON.stringify([...copied]);
          if (!workerEqual) throw Error("Worker/direct geometry disagreement");
          const origin = BigInt(extent / 65536);
          const transform = [0, 1, 2, 3].map((k) =>
            placement(id, 2, k, axis === 0 ? origin : 0n, axis === 1 ? origin : 0n),
          );
          const projected = [...direct];
          for (let i = 0; i < projected.length; i += 3) {
            projected[i] += transform[2];
            projected[i + 1] += transform[3];
          }
          const expected =
            axis === 0
              ? [255 / 16, 100, 0.25, 383 / 16, 100, 0.25]
              : [100, 255 / 16, 0.25, 100, 383 / 16, 0.25];
          const preciseGeometry = JSON.stringify(projected) === JSON.stringify(expected);
          result.push({
            extent,
            axis,
            compact,
            samples: points.length,
            canonicalEqual,
            tailExpectedUnique: 128,
            preciseGeometry,
            firstPrecise,
            firstProjected,
            firstExpected: points[0][axis],
            projected,
            expected,
            transform,
            tailSourceUnique: new Set(source).size,
            tailFirst: source[0],
            tailLast: source.at(-1),
            segments: count,
            wide: useWide,
            workerEqual,
            bounds: [0, 1, 2, 3].map((field) => core.raw_chunk_bounds(id, 2, field)),
          });
        }
      }
    }
    return result;
  });
  const unresolved = cases.filter((item) => !item.preciseGeometry || !item.firstPrecise);
  await writeFile(
    `${output}/results.json`,
    JSON.stringify(
      {
        status: unresolved.length ? "geometry-precision-unresolved" : "bounded-cases-pass",
        cases,
        unresolved: unresolved.length,
        errors,
        limitation:
          "Owning Wasm geometry audit in the actual app; no image or performance acceptance claim.",
      },
      null,
      2,
    ),
  );
  if (errors.length) throw Error(errors.join("; "));
  console.log(
    `Canonical/history and worker parity verified in ${cases.length} cases; ${unresolved.length} geometry precision failures remain.`,
  );
  if (unresolved.length)
    throw Error("Long-source geometry acceptance is unresolved; see saved cases");
} finally {
  await browser.close();
}
