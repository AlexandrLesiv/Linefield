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
    const result = [];
    // One source starts near zero, then contains a fine tail in a later region.
    // A compact source at that same region is the translation-invariant control.
    for (const extent of [0, 65536, 1048576, 16777216, 4294967296]) {
      for (const axis of [0, 1]) {
        for (const compact of [false, true]) {
          const id = core.begin_fixed_width(0.25, 0, 1);
          const points = Array.from({ length: 385 }, (_, i) => {
            const along = (compact || i > 0 ? extent : 0) + i / 16;
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
          const count = core.render_chunk(id, 2, 0.0001);
          const direct = new Float32Array(
            core.memory.buffer,
            core.render_chunk_ptr(),
            count * 6,
          ).slice();
          const size = core.geometry_snapshot(id, 2);
          const prepared = core.render_snapshot(size, 0.0001);
          const copied = new Float32Array(
            core.memory.buffer,
            core.render_chunk_ptr(),
            prepared * 6,
          ).slice();
          const workerEqual = JSON.stringify([...direct]) === JSON.stringify([...copied]);
          if (!workerEqual) throw Error("Worker/direct geometry disagreement");
          result.push({
            extent,
            axis,
            compact,
            samples: points.length,
            canonicalEqual,
            tailExpectedUnique: 128,
            tailSourceUnique: new Set(source).size,
            tailFirst: source[0],
            tailLast: source.at(-1),
            segments: count,
            workerEqual,
            bounds: [0, 1, 2, 3].map((field) => core.raw_chunk_bounds(id, 2, field)),
          });
        }
      }
    }
    return result;
  });
  const unresolved = cases.filter((item) => item.tailSourceUnique !== item.tailExpectedUnique);
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
