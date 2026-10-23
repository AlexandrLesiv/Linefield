import { regionFixture } from "./region-fixture.ts";
import { assertions } from "./tail-fixture.ts";
import { canonicalRegion } from "./region-oracle.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { currentCoverage } from "../../../src/memory/current-coverage.ts";
import { LiveOwner } from "../../../src/memory/live-owner.ts";
import { loadPreparation } from "../../../src/memory/preparation-loader.ts";
import { consumePrefix } from "../../../src/memory/consume-prefix.ts";
import { sceneGraph } from "../../../src/memory/display-graph.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
export async function regionHeldFold(canvas: HTMLCanvasElement) {
  const { check, report } = assertions(),
    f = await regionFixture(canvas);
  const live = new LiveOwner(f.state),
    reader = f.cache.reader.bind(f.cache);
  let held = false,
    release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  f.cache.reader = async function* (...args) {
    if (!held) {
      held = true;
      await gate;
    }
    yield* reader(...args);
  };
  try {
    const copies = metrics.panCopies;
    f.pan(24, 16);
    f.start();
    const deadline = performance.now() + 3000;
    for (;;) {
      if (held) break;
      if (performance.now() > deadline) throw Error("preparation gate not reached");
      await new Promise<void>((resolve) => setTimeout(resolve, 4));
    }
    const first = edit.begin(f.state(), 1, 80, 80, 0.5, true);
    check(first.code === "ok", "fresh Begin accepted while candidate preparation is held");
    f.update(first);
    const source = scene.ids(f.state(), 0n).ids.at(-1);
    check(!!source, "new live source exists");
    live.start(source!, f.detail, f.renderer, await loadPreparation());
    f.update(
      edit.append(
        first,
        1n,
        new Float64Array([120]),
        new Float64Array([120]),
        new Float64Array([0.5]),
        new Uint8Array([1]),
      ),
    );
    check(f.state().code === "ok", "live append accepted");
    f.update(edit.end(first, 2n));
    check(f.state().code === "ok", "first End accepted during held reconstruction");
    while (live.value?.through !== 2n) {
      if (performance.now() > deadline) throw Error("live coverage completion timeout");
      await f.renderer.slot();
      live.advance(currentCoverage(f.state(), live.value?.frame, f.base.installed));
      await f.renderer.validated(f.renderer.check());
    }
    const second = edit.begin(f.state(), 1, 150, 90, 0.5, true);
    check(second.code === "ok", "second Begin accepted before old candidate completion");
    f.update(second);
    const q = currentCoverage(
      f.state(),
      live.value?.frame,
      f.base.installed,
      f.candidate.receipt?.id,
    );
    check(
      q.canFold && q.liveState === "ended",
      "real ended live coverage authorizes fold during second stroke",
    );
    const generation = f.renderer.resources.baseGeneration;
    await f.renderer.slot();
    check(
      consumePrefix(
        f.state,
        f.renderer,
        f.base,
        f.candidate,
        live,
        () => sceneGraph(f.state(), f.base, f.candidate, live, q),
        q,
        f.detail,
      ),
      "ordinary consumePrefix performs base fold",
    );
    await f.renderer.validated(f.renderer.check());
    check(
      f.renderer.resources.baseGeneration > generation,
      "real fold invalidates source RGB generation",
    );
    release();
    await f.idle();
    check(
      metrics.panCopies === copies && !f.candidate.ready,
      "obsolete held candidate never copies modified B or publishes",
    );
    f.update(edit.cancel(second, "escape"));
    check(f.state().code === "ok", "second interaction cancels independently");
    f.start();
    await f.idle(true);
    const pixels = await canonicalRegion(f, f.pixels(), check);
    return { ...report(), pixels, completedContent: String(f.state().content) };
  } finally {
    release();
    f.cache.reader = reader;
    live.dispose();
    await f.close();
  }
}
