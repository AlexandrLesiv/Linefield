import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { PreparationExecutor } from "../../../src/memory/preparation-executor.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import type { regionFixture } from "./region-fixture.ts";
export class RegionCache extends PreparedCache {
  evict() {
    for (const entry of [...this.lru.keys()]) this.clear(entry);
  }
  recipes() {
    return [...this.lru.keys()].flatMap((entry) => entry.pages.map((page) => page.recipe));
  }
}
export async function preparationParity(
  f: Awaited<ReturnType<typeof regionFixture>>,
  check: (value: boolean, label: string) => void,
) {
  if (!(f.cache instanceof RegionCache)) throw Error("parity cache required");
  const cache = f.cache,
    source = scene.ids(f.state(), 0n).ids[0],
    frame = f.base.receipt?.id;
  if (!source || !frame) throw Error("parity source missing");
  const read = async (detail = f.detail) => {
    const rows = [];
    for await (const page of cache.reader(source, 2n, detail, frame, 0n)) {
      const placement = frames.placement(f.state(), frame, source, page.page);
      check(placement.code === "ok" && placement.available, "parity source placement available");
      rows.push({
        data: [...page.data],
        matrix: [...placement.matrix],
        offset: placement.offset,
        epoch: String(placement.epoch),
        recipe: page.recipe,
      });
    }
    return rows;
  };
  const retained = await read();
  check(retained.length > 0, "retained actual page positive control");
  cache.evict();
  const misses = metrics.preparedMisses,
    rebuilt = await read();
  check(
    metrics.preparedMisses > misses && JSON.stringify(rebuilt) === JSON.stringify(retained),
    "evicted regenerated data partition placement and recipe are exact",
  );
  const input = frames.preparation(f.state(), source, 0n, 2n, f.detail, frame);
  check(input.code === "ok" && !!input.token, "immutable preparation input issued");
  const executor = new PreparationExecutor();
  try {
    const raw = async (urgent: boolean) => {
      const pages = [];
      for await (const page of executor.pages(input, urgent))
        pages.push({ data: [...page.data], origin: [...page.origin], done: page.done });
      return pages;
    };
    const workerPages = metrics.workerPages,
      fallbackPages = metrics.fallbackPages;
    const worker = await raw(false),
      fallback = await raw(true);
    check(
      metrics.workerPages > workerPages && metrics.fallbackPages > fallbackPages,
      "actual worker and local preparation both executed",
    );
    check(
      worker.some((page) => page.data.length > 0) &&
        JSON.stringify(worker) === JSON.stringify(fallback),
      "worker fallback page partition data origins are exact",
    );
    return {
      retainedPages: retained.length,
      workerPages: worker.length,
      fallbackPages: fallback.length,
    };
  } finally {
    executor.dispose();
    preparation.release(f.state(), input.token);
  }
}
