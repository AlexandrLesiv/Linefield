import { retentionSource } from "./retention-source.ts";
import { assertions } from "./tail-fixture.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
const turn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export async function retentionPressure() {
  const { check, report } = assertions();
  const count = 524289,
    second = 16385;
  const f = retentionSource(count, second);
  const { cache, source, other } = f;
  if (!other) throw Error("second canonical source");
  const readB = async () => {
    for (let chunk = 0; chunk < (second + 127) / 128; chunk++) await f.read(other, second, chunk);
  };
  try {
    const fill = cache.begin();
    const refused = metrics.preparedCapacityRefusals;
    let chunks = 0,
      oldestUnused = 0n;
    for (; chunks < (count + 127) / 128; chunks++) {
      const page = await f.read(source, count, chunks);
      if (chunks === 1) oldestUnused = page.first;
      if (metrics.preparedCapacityRefusals > refused) break;
    }
    check(
      metrics.preparedCapacityRefusals > refused,
      "actual canonical A positively fills retention capacity",
    );
    cache.end(fill, false);
    const before = cache.resources();
    const pass = cache.begin();
    const pressure = metrics.preparedCapacityRefusals;
    await readB();
    const hits = metrics.preparedHits;
    const retained = await f.read(source, count);
    await turn();
    check(metrics.preparedHits === hits + 1, "late A read still hits after the full B scan");
    check(
      metrics.preparedCapacityRefusals > pressure,
      "real worker B positively streamed against protected capacity",
    );
    check(
      metrics.preparedPressureRetirements === 0,
      "no pressure eviction throughout captured passes",
    );
    cache.end(pass, true);
    for (let i = 0; i < 100 && !metrics.preparedPressureRetirements; i++) await turn();
    check(
      metrics.preparedPressureRetirements > 0,
      "successful full pass admits bounded unused-resident retirement",
    );
    const next = cache.begin();
    check(
      (await f.read(source, count, 1)).first !== oldestUnused,
      "oldest unused A entry is the LRU victim, not the later-used first entry",
    );
    check(
      (await f.read(source, count)).first === retained.first,
      "late A hit retains exact page identity",
    );
    await readB();
    cache.end(next, true);
    const warmHits = metrics.preparedHits;
    const warm = cache.begin();
    await readB();
    cache.end(warm, true);
    check(
      metrics.preparedHits > warmHits,
      "subsequent real B pass consumes retained worker geometry",
    );
    const cancelled = cache.begin();
    const credits = metrics.preparedIdleCredits;
    cache.end(cancelled, false);
    await turn();
    check(metrics.preparedIdleCredits === credits, "cancelled pass grants no idle credit");
    const successor = cache.begin();
    cache.end(cancelled, true);
    let guarded = false;
    try {
      cache.begin();
    } catch {
      guarded = true;
    }
    check(guarded, "old close cannot clear successor token");
    cache.end(successor, false);
    return {
      ...report(),
      chunks,
      before,
      after: cache.resources(),
      scope:
        "actual canonical sources, workers, adopted pages and placement; not actual-route input or throughput",
    };
  } finally {
    f.close();
  }
}
