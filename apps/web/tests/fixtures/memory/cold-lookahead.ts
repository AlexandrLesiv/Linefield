import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { FrameVisibility } from "../../../src/memory/frame-visibility.ts";
import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { visibilityState, visibilityStroke, visibilityFault } from "./visibility-fixture.ts";
import { samplingPixels, samplingDifference, samplingImage } from "./sampling-pixels.ts";
import { closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
import { coldReaders } from "./cold-readers.ts";
export type ColdMode = "order" | "boundary" | "cancel" | "query-error";
export async function coldLookahead(canvas: HTMLCanvasElement, mode: ColdMode) {
  let state = edit.style(visibilityState(), 12, [1, 0, 0]);
  state = visibilityStroke(state, mode === "boundary" ? 512 : 1025);
  if (mode === "boundary") {
    state = edit.style(state, 12, [0, 0, 1]);
    state = visibilityStroke(state, 129);
  }
  let receipt = frames.capture(state),
    released = false;
  if (receipt.code !== "ok") throw Error("cold capture");
  const renderer = new GpuRenderer(canvas, 1024, 768);
  let cache = new PreparedCache(() => state);
  const draw = renderer.draw.bind(renderer),
    composite = renderer.composite.bind(renderer);
  renderer.draw = (data, matrix, color, page) =>
    draw(data, matrix, [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0, 0.5], page);
  const pixels = () => samplingPixels(renderer, renderer.resources.staging.framebuffer);
  const run = (signal = new AbortController().signal) =>
    buildFrame(
      () => state,
      cache,
      renderer,
      receipt,
      1,
      () => !signal.aborted,
      signal,
    );
  let restoreReaders = () => {},
    releaseHead = () => {};
  let completion: Promise<{ built: boolean; error: string }> | undefined;
  const controller = new AbortController();
  const visibilityNext = FrameVisibility.prototype.next;
  let queryErrors = 0;
  try {
    if (!(await run())) throw Error("cold reference");
    const reference = pixels();
    cache.dispose();
    cache = new PreparedCache(() => state);
    if (visibilityFault(32768, true) !== "ok") throw Error("cold hull eviction");
    FrameVisibility.prototype.next = function (...args) {
      try {
        return visibilityNext.apply(this, args);
      } catch (error) {
        queryErrors++;
        throw error;
      }
    };
    const readers = coldReaders(
      cache,
      mode === "query-error"
        ? () => {
            if (frames.release(state, receipt.id) !== "ok")
              throw Error("query fault receipt release");
            released = true;
          }
        : undefined,
    );
    restoreReaders = readers.restore;
    releaseHead = readers.release;
    let draws = 0,
      composites = 0,
      lastReader = -1;
    renderer.draw = (data, matrix, color, page = 0n) => {
      const index = readers.pages.get(page);
      if (index === undefined || index < lastReader) throw Error("painter-order head overtaken");
      lastReader = index;
      draws++;
      draw(data, matrix, [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0, 0.5], page);
    };
    renderer.composite = () => {
      composites++;
      composite();
    };
    const before = { ...metrics };
    let settled = false;
    completion = run(controller.signal).then(
      (built) => {
        settled = true;
        return { built, error: "" };
      },
      (error: unknown) => {
        settled = true;
        return { built: false, error: String(error) };
      },
    );
    const expected = mode === "boundary" || mode === "query-error" ? 4 : 8;
    const deadline = performance.now() + 10000;
    while (mode === "query-error" ? !queryErrors : readers.snapshot().readyLater < expected - 1) {
      if (settled || performance.now() > deadline)
        throw Error(`cold admission ${JSON.stringify(readers.snapshot())}`);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    const held = {
      ...readers.snapshot(),
      draws,
      composites,
      queries: metrics.visibilityQueries - before.visibilityQueries,
      queryErrors,
      visibilityBytes: metrics.visibilityBytes,
    };
    if (
      held.started !== expected ||
      held.peak > 8 ||
      held.draws ||
      held.composites ||
      (mode !== "query-error" && held.queries < 2)
    )
      throw Error(`held cold ${JSON.stringify(held)}`);
    if (mode === "cancel") controller.abort();
    readers.release();
    const result = await completion;
    if (
      (mode === "query-error" ? !result.error : !!result.error) ||
      result.built !== (mode === "order" || mode === "boundary")
    )
      throw Error(`cold outcome ${JSON.stringify(result)}`);
    const drained = readers.snapshot();
    if (drained.active || drained.closed !== drained.started || metrics.visibilityBytes !== 0)
      throw Error(`cold drain ${JSON.stringify({ drained, visibility: metrics.visibilityBytes })}`);
    readers.restore();
    renderer.draw = (data, matrix, color, page) =>
      draw(data, matrix, [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0, 0.5], page);
    renderer.composite = composite;
    if (result.built && composites !== (mode === "boundary" ? 2 : 1))
      throw Error("group composite count");
    const builtPixels = result.built ? pixels() : undefined;
    if (!result.built) {
      cache.dispose();
      if (cache.resources().bytes || cache.resources().pages || cache.resources().tickets)
        throw Error("cancelled preparation ownership");
      cache = new PreparedCache(() => state);
    }
    if (released) {
      receipt = frames.capture(state);
      released = false;
      if (receipt.code !== "ok") throw Error("fresh recovery receipt");
    }
    const jobs = metrics.jobs,
      misses = metrics.preparedMisses;
    if (!(await run())) throw Error("fresh/warm successor");
    const current = pixels(),
      difference = samplingDifference(current, reference);
    const controlled = builtPixels ? samplingDifference(builtPixels, reference) : difference;
    if (
      difference.changed ||
      controlled.changed ||
      !difference.ink ||
      !current.every((v, i) => i % 4 !== 3 || v === reference[i]) ||
      (builtPixels && !builtPixels.every((v, i) => i % 4 !== 3 || v === reference[i]))
    )
      throw Error(
        `cold pixels ${JSON.stringify({
          difference,
          controlled,
          reference: await samplingImage(renderer, reference),
          current: await samplingImage(renderer, current),
        })}`,
      );
    if (result.built && (metrics.jobs !== jobs || metrics.preparedMisses !== misses))
      throw Error("warm lookahead created preparation work");
    return {
      mode,
      held,
      drained,
      result,
      composites,
      difference,
      controlled,
      warmJobs: metrics.jobs - jobs,
      warmMisses: metrics.preparedMisses - misses,
      scope: "controlled real generated visibility/worker/FrameCommands/renderer; not timing",
    };
  } finally {
    controller.abort();
    releaseHead();
    await completion;
    restoreReaders();
    FrameVisibility.prototype.next = visibilityNext;
    renderer.draw = draw;
    renderer.composite = composite;
    cache.dispose();
    if (!released) frames.release(state, receipt.id);
    await retireRenderer(renderer);
    closeTailFixture(state);
  }
}
