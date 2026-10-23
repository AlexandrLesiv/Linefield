import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import type { RegionOptions } from "./region-fixture.ts";
import { regionImage } from "./region-oracle.ts";
export async function regionPixels(canvas: HTMLCanvasElement, matrix = false) {
  const { check, report } = assertions(),
    rows = [];
  const cases: RegionOptions[] = matrix
    ? [1, 2, 1.25].flatMap((backing) =>
        [0.05, 1].flatMap((zoom) =>
          [0, Math.PI / 12, Math.PI / 2, Math.PI].map((angle) => ({ backing, zoom, angle })),
        ),
      )
    : [{}];
  if (matrix) cases.push({ backing: 1.25, zoom: 0.05, angle: Math.PI / 12, far: true });
  if (matrix) cases.push({ width: 257, height: 193, translucent: true });
  for (const options of cases) {
    const f = await regionFixture(canvas, options),
      gl = f.renderer.gl;
    const draw = gl.drawArraysInstanced.bind(gl);
    let draws = 0;
    gl.drawArraysInstanced = (...args) => {
      draws++;
      draw(...args);
    };
    try {
      check(f.renderer.resources.integerQuad, "supported integer quad capability");
      check(!!f.base.receipt?.recipe?.eligible, "ordinary completed B has real provenance");
      for (const [x, y] of [
        [24, 16],
        [-40, -8],
      ] as const) {
        const copies = metrics.panCompleted,
          skipped = metrics.panSkippedDraws;
        f.pan(x, y);
        draws = 0;
        f.start();
        await f.idle(true);
        check(metrics.panCompleted === copies + 1, "ordinary stopped pan completed integer copy");
        const reused = f.pixels(),
          reusedDraws = draws;
        const image = regionImage(reused, f.renderer.width, f.renderer.height, [
          x * (options.backing ?? 1),
          y * (options.backing ?? 1),
        ]);
        check(image.ink > 0 && image.paper > 0, "copied target has positive ink and paper");
        check(image.exposedInk > 0, "newly exposed dirty strips contain reconstructed ink");
        const full = frames.capture(f.state());
        check(full.code === "ok", "full reference captures same anchored phase");
        try {
          draws = 0;
          check(
            await buildFrame(
              f.state,
              f.cache,
              f.renderer,
              full,
              f.detail,
              () => true,
              new AbortController().signal,
              undefined,
              undefined,
              true,
            ),
            "full reference completes",
          );
          const rebuilt = f.pixels();
          let different = 0;
          for (let i = 0; i < rebuilt.length; i++)
            if (i % 4 !== 3 && rebuilt[i] !== reused[i]) different++;
          check(
            different === 0,
            `exact region/full RGB parity ${JSON.stringify(options)} shift ${x},${y}: ${different}`,
          );
          check(
            metrics.panSkippedDraws > skipped && draws > reusedDraws,
            "warm copy avoids actual interior GPU draws",
          );
          rows.push({
            options,
            x,
            y,
            reusedDraws,
            fullDraws: draws,
            different,
            image,
            packed: f.renderer.resources.packed,
          });
        } finally {
          frames.release(f.state(), full.id);
        }
        f.promote();
      }
    } finally {
      gl.drawArraysInstanced = draw;
      await f.close();
    }
  }
  return { ...report(), rows };
}
