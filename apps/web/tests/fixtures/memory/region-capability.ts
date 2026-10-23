import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { canonicalRegion } from "./region-oracle.ts";
export async function regionCapability(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    rows = [];
  for (const [width, height] of [
    [32, 192],
    [8192, 64],
    [256, 192],
  ] as const) {
    const f = await regionFixture(canvas, { width, height });
    const placement = frames.placement;
    let canonicalPlacements = 0;
    try {
      const supported = width === 256;
      frames.placement = (...args) => {
        const value = placement(...args);
        if (!supported && value.available) {
          check(
            value.epoch === 0n && value.offset.every((n) => n === 0),
            "unsupported placement uses canonical zero phase",
          );
          canonicalPlacements++;
        }
        return value;
      };
      check(f.renderer.resources.integerQuad === supported, "per-generation viewport capability");
      const copies = metrics.panCompleted,
        misses = metrics.panCapabilityMisses;
      f.pan(8);
      f.start();
      await f.idle(true);
      check(f.candidate.ready, "unsupported dimensions preserve original canonical admission");
      check(
        metrics.panCompleted === copies + Number(supported),
        "unsupported route never copies anchored pixels",
      );
      if (!supported)
        check(metrics.panCapabilityMisses > misses, "explicit capability miss counted");
      const pixels = !supported ? await canonicalRegion(f, f.pixels(), check) : undefined;
      if (!supported)
        check(
          canonicalPlacements > 0,
          "canonical phase assertions reached actual visible geometry",
        );
      rows.push({
        width,
        height,
        supported,
        canonicalPlacements,
        pixels,
        epoch: String(f.candidate.receipt?.recipe?.epoch),
      });
    } finally {
      frames.placement = placement;
      await f.close();
    }
  }
  return { ...report(), rows };
}
