import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { canonicalRegion } from "./region-oracle.ts";
export async function regionFailures(canvas: HTMLCanvasElement, mode: "placement" | "source") {
  const { check, report } = assertions(),
    f = await regionFixture(canvas);
  const original = frames.placement,
    reader = f.cache.reader.bind(f.cache);
  let observed = 0,
    gated = false,
    release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  try {
    if (mode === "placement")
      frames.placement = (...args) => {
        const value = original(...args);
        if (value.epoch !== 0n && ++observed === 2)
          return { ...value, available: false, disposition: "anchorMiss", miss: "phase" };
        return value;
      };
    else
      f.cache.reader = async function* (...args) {
        if (!gated) {
          gated = true;
          await gate;
        }
        yield* reader(...args);
      };
    const before = metrics.panFallbacks,
      copies = metrics.panCopies;
    f.pan(24, 16);
    f.start();
    if (mode === "source") {
      const deadline = performance.now() + 3000;
      for (;;) {
        if (gated) break;
        if (performance.now() > deadline) throw Error("source preparation hold timeout");
        await new Promise<void>((resolve) => setTimeout(resolve, 4));
      }
      // Inject a real B/S swap ABA while the original immutable recipe remains held.
      const image = f.renderer.resources.base.texture;
      f.renderer.promote();
      f.renderer.promote();
      check(f.renderer.resources.base.texture === image, "texture ABA restored identity");
      release();
    }
    await f.idle(true);
    check(metrics.panFallbacks === before + 1, "one canonical retry after optional failure");
    check(
      !f.candidate.receipt?.recipe?.eligible,
      "canonical retry cannot acquire anchored provenance",
    );
    check(
      metrics.panCopies === copies + (mode === "placement" ? 1 : 0),
      "late placement copies once; stale B never copied",
    );
    check(f.candidate.ready, "canonical retry publishes without reanchor loop");
    const pixels = await canonicalRegion(f, f.pixels(), check);
    return { ...report(), mode, observed, pixels };
  } finally {
    release();
    frames.placement = original;
    f.cache.reader = reader;
    await f.close();
  }
}
