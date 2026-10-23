import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { ReadyPreparation } from "../../../src/memory/ready-preparation.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { visibilityState, visibilityFault } from "./visibility-fixture.ts";
import { samplingPixels, samplingDifference } from "./sampling-pixels.ts";
import { closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function coldProgress(canvas: HTMLCanvasElement) {
  let state = edit.begin(visibilityState(), 1, 300, 300, 0.5, true);
  if (state.code !== "ok") throw Error("progress begin");
  const count = 32769;
  for (let first = 1; first < count; first += 256) {
    const length = Math.min(256, count - first);
    state = edit.append(
      state,
      BigInt(first),
      Float64Array.from({ length }, (_, i) =>
        first + i < 512 ? 300 + Math.sin((first + i) / 9) * 50 : 2000,
      ),
      Float64Array.from({ length }, (_, i) => 300 + Math.cos((first + i) / 11) * 50),
      new Float64Array(length).fill(0.5),
      new Uint8Array(length).fill(1),
    );
    if (state.code !== "ok") throw Error("progress append");
  }
  state = edit.end(state, BigInt(count));
  if (state.code !== "ok") throw Error("progress end");
  const receipt = frames.capture(state);
  if (receipt.code !== "ok") throw Error("progress capture");
  const renderer = new GpuRenderer(canvas, 1024, 768),
    cache = new PreparedCache(() => state);
  const poll = ReadyPreparation.prototype.poll,
    draw = renderer.draw.bind(renderer);
  const run = () =>
    buildFrame(
      () => state,
      cache,
      renderer,
      receipt,
      1,
      () => true,
      new AbortController().signal,
    );
  const pixels = () => samplingPixels(renderer, renderer.resources.staging.framebuffer);
  try {
    if (!(await run())) throw Error("progress canonical reference");
    const reference = pixels();
    if (visibilityFault(32768, true) !== "ok") throw Error("progress cold index");
    const before = { ...metrics };
    let firstPageHulls = 0,
      firstDrawHulls = 0,
      pages = 0;
    ReadyPreparation.prototype.poll = function () {
      const result = poll.call(this);
      if (result.kind === "page") {
        if (!pages++) firstPageHulls = metrics.visibilityHulls - before.visibilityHulls;
      }
      return result;
    };
    renderer.draw = (...args) => {
      firstDrawHulls ||= metrics.visibilityHulls - before.visibilityHulls;
      draw(...args);
    };
    if (!(await run())) throw Error("progress warm frame");
    const current = pixels(),
      difference = samplingDifference(current, reference);
    const result = {
      firstPageHulls,
      firstDrawHulls,
      pages,
      hulls: metrics.visibilityHulls - before.visibilityHulls,
      queries: metrics.visibilityQueries - before.visibilityQueries,
      jobs: metrics.jobs - before.jobs,
      misses: metrics.preparedMisses - before.preparedMisses,
      visibilityBytes: metrics.visibilityBytes,
      difference,
    };
    if (
      !pages ||
      firstPageHulls <= 0 ||
      firstPageHulls > 8 ||
      result.hulls !== 257 ||
      result.queries < 65 ||
      result.jobs ||
      result.misses ||
      result.visibilityBytes ||
      difference.changed ||
      !difference.ink ||
      !current.every((v, i) => i % 4 !== 3 || v === reference[i])
    )
      throw Error(`ready head progress ${JSON.stringify(result)}`);
    return {
      ...result,
      scope:
        "real warm retained head delivered before cold progress-only traversal ends; exact GL parity",
    };
  } finally {
    ReadyPreparation.prototype.poll = poll;
    renderer.draw = draw;
    cache.dispose();
    frames.release(state, receipt.id);
    await retireRenderer(renderer);
    closeTailFixture(state);
  }
}
