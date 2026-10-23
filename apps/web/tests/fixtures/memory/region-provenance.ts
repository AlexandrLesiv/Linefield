import { regionCommandBudget } from "./region-command-budget.ts";
import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { canonicalRegion } from "./region-oracle.ts";
import { RegionCache, preparationParity } from "./region-preparation-parity.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
class StreamingCache extends RegionCache {
  protected override room() {
    return false;
  }
}
export async function regionProvenance(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    rows = [];
  for (const mode of ["exact", "finer", "clipped", "streamed", "unknown"] as const) {
    const f = await regionFixture(canvas, {
      cacheClass: mode === "streamed" ? StreamingCache : RegionCache,
      ...(mode === "clipped" ? { broad: true, zoom: 0.05, strokes: 1 } : {}),
    });
    if (!(f.cache instanceof RegionCache)) throw Error("region cache missing");
    const reader = f.cache.reader.bind(f.cache);
    try {
      const parity = mode === "exact" ? await preparationParity(f, check) : undefined;
      if (mode === "finer" || mode === "unknown") {
        f.cache.evict();
        if (mode === "finer")
          for (const id of scene.ids(f.state(), 0n).ids)
            for await (const page of f.cache.reader(id, 2n, 2, f.base.receipt!.id, 0n))
              check(page.recipe?.detail === 2, "actual finer preparation provenance");
        else
          f.cache.reader = async function* (...args) {
            for await (const page of reader(...args)) {
              const unknown = { ...page };
              delete unknown.recipe;
              yield unknown;
            }
          };
        const full = frames.capture(f.state());
        check(full.code === "ok", "fallback source capture");
        check(
          await buildFrame(
            f.state,
            f.cache,
            f.renderer,
            full,
            f.detail,
            () => true,
            new AbortController().signal,
          ),
          "actual provenance source B renders",
        );
        f.renderer.promote();
        f.base.publish(full, f.renderer, true);
        f.update(frames.ready(f.state(), full.id));
        check(
          f.state().code === "ok" || f.state().code === "noop",
          "rebuilt source B acknowledged",
        );
        f.cache.reader = reader;
      }
      if (mode === "clipped")
        check(
          f.cache.recipes().some((r) => r?.unclipped === false),
          "actual broad source clipped preparation positive control",
        );
      const positive = mode === "exact" || mode === "streamed";
      check(
        f.base.receipt?.recipe?.eligible === positive,
        `B certificate reflects ${mode} page provenance`,
      );
      if (mode === "streamed")
        check(f.cache.resources().pages === 0, "streamed pages are not retained");
      const copies = metrics.panCompleted,
        misses = metrics.panRecipeMisses;
      f.pan(24, 16);
      f.start();
      await f.idle(true);
      check(
        metrics.panCompleted === copies + Number(positive),
        "only exact or proven streamed B reuses pixels",
      );
      if (!positive)
        check(
          metrics.panRecipeMisses === misses + 1,
          "finer clipped unknown B selects complete reconstruction",
        );
      const pixels = await canonicalRegion(f, f.pixels(), check);
      rows.push({ mode, parity, pixels, recipe: f.candidate.receipt?.recipe?.eligible });
    } finally {
      f.cache.reader = reader;
      await f.close();
    }
  }
  const budget = await regionCommandBudget(canvas, check);
  return { ...report(), rows, budget };
}
