import { writeFile } from "node:fs/promises";
import { captureDrawing } from "./vector-drawing-capture.mjs";

/** Rotate through actual browser input; compare only the common visible tail. */
export async function checkWideCamera(page, frame, clip, _original, label = "tail") {
  const host = page.frameLocator("iframe");
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
  // The first 128-sample chunk intentionally has a different leading point.
  // Rotation can bring its differently simplified geometry into the old crop.
  // This bounded crop stays on the shared later chunks for both +/-0.08 views.
  const rotatedClip = { ...clip, y: 320, height: 200 };
  const baseline = await captureDrawing(frame, rotatedClip);
  const before = JSON.stringify(await raw());
  const views = [];
  const box = await host.locator("canvas").boundingBox();
  const cx = box.x + box.width / 2,
    cy = box.y + box.height / 2;
  await host.locator("#rotate").click();
  for (const angle of [0.08, -0.08]) {
    await page.mouse.move(cx + 250, cy);
    await page.mouse.down();
    await page.mouse.move(cx + 250 * Math.cos(angle), cy + 250 * Math.sin(angle), { steps: 8 });
    await page.mouse.up();
    const details = process.env.LINEFIELD_CAPTURE_WIDE_PIXELS === "1";
    const capture = await captureDrawing(frame, rotatedClip, details);
    const rotated = details ? capture.hash : capture;
    if (details) {
      capture.geometry = await frame.evaluate(() => {
        const core = lab.core,
          origin = lab.viewOrigin().map(BigInt);
        const transform = [0, 1, 2, 3].map((k) => core.stroke_transform_relative(0, k, ...origin));
        const chunks = [];
        for (let chunk = 0; chunk < Math.ceil(core.length(0) / 128); chunk++) {
          const wide = core.geometry_requires_f64(0, chunk);
          const count = wide
            ? core.render_chunk_f64(0, chunk, 2 ** lab.metrics.lodLevel)
            : core.render_chunk(0, chunk, 2 ** lab.metrics.lodLevel);
          const source = wide
            ? new Float64Array(core.memory.buffer, core.render_chunk_f64_ptr(), count * 6)
            : new Float32Array(core.memory.buffer, core.render_chunk_ptr(), count * 6);
          const projected = [];
          for (let i = 0; i < source.length; i += 3)
            projected.push(
              Math.fround(transform[0] * source[i] - transform[1] * source[i + 1] + transform[2]),
              Math.fround(transform[1] * source[i] + transform[0] * source[i + 1] + transform[3]),
              Math.fround(source[i + 2] * Math.hypot(transform[0], transform[1])),
            );
          chunks.push({ chunk, wide, count, projected });
        }
        return {
          transform,
          view: lab.view(),
          origin: lab.viewOrigin(),
          level: lab.metrics.lodLevel,
          chunks,
        };
      });
      await writeFile(
        `${process.env.LINEFIELD_EVIDENCE_DIR}/${label}-${angle}.json`,
        JSON.stringify(capture),
      );
    }
    if (JSON.stringify(rotated) === JSON.stringify(baseline))
      throw Error("Camera rotation did not change tail pixels");
    views.push(rotated);
    await host.locator("#rotation-reset").click();
    if (JSON.stringify(await captureDrawing(frame, rotatedClip)) !== JSON.stringify(baseline))
      throw Error("Rotation reset changed tail pixels");
  }
  if (JSON.stringify(await raw()) !== before)
    throw Error("Camera rotation changed canonical samples");
  return views;
}

export async function captureWideStage(frame, clip, label) {
  const details = process.env.LINEFIELD_CAPTURE_WIDE_PIXELS === "1";
  const result = await captureDrawing(frame, clip, details);
  if (!details) return result;
  await writeFile(`${process.env.LINEFIELD_EVIDENCE_DIR}/${label}.json`, JSON.stringify(result));
  return result.hash;
}
