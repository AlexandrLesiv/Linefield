import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { FrameCommands } from "../../../src/memory/frame-commands.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { visibilityState } from "./visibility-fixture.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function retentionCleanup(canvas: HTMLCanvasElement) {
  const { check, report } = assertions();
  const state = visibilityState(),
    receipt = frames.capture(state);
  const cache = new PreparedCache(() => state);
  const renderer = new GpuRenderer(canvas, 1024, 768);
  let release = () => {},
    reached = () => {},
    alive = true;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const entered = new Promise<void>((resolve) => {
    reached = resolve;
  });
  const dispose = FrameCommands.prototype.dispose;
  FrameCommands.prototype.dispose = async function () {
    reached();
    await held;
    await dispose.call(this);
  };
  try {
    const pending = buildFrame(
      () => state,
      cache,
      renderer,
      receipt,
      1,
      () => alive,
      new AbortController().signal,
    );
    await entered;
    const credits = metrics.preparedIdleCredits;
    let cpuGuard = false,
      gpuGuard = false;
    try {
      cache.begin();
    } catch {
      cpuGuard = true;
    }
    try {
      renderer.protect();
    } catch {
      gpuGuard = true;
    }
    check(cpuGuard && gpuGuard, "both exact owners remain protected through awaited disposal");
    alive = false;
    release();
    check(!(await pending), "builder returns fresh relevance after cleanup");
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    check(
      metrics.preparedIdleCredits === credits,
      "post-validation invalidation grants no idle retirement credit",
    );
    const cpu = cache.begin(),
      gpu = renderer.protect();
    cache.end(cpu, false);
    renderer.unprotect(gpu, false);
    return { ...report(), scope: "positive final-cleanup hold; no input or throughput evidence" };
  } finally {
    release();
    FrameCommands.prototype.dispose = dispose;
    cache.dispose();
    frames.release(state, receipt.id);
    closeTailFixture(state);
    await retireRenderer(renderer);
  }
}
