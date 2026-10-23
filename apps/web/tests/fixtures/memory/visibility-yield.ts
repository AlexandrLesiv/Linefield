import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { geometryMetrics } from "../../../src/memory/geometry-metrics.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
import { visibilityState, visibilityStroke, visibilityFault } from "./visibility-fixture.ts";

export async function visibilityYield(canvas: HTMLCanvasElement) {
  const { check, report } = assertions();
  let state = visibilityStroke(visibilityState(), 65537);
  state = edit.panBegin(state, 3, 500, 400, false);
  check(state.code === "ok", "pan begin accepted");
  const panMapping = state.mapping;
  state = edit.panUpdate(state, 1n, 2000, 400, false);
  check(state.code === "ok", "pan update accepted");
  state = edit.panEnd({ ...state, mapping: panMapping }, 1n);
  check(state.code === "ok", "captured view wholly outside source");
  check(visibilityFault(32768, true) === "ok", "explicit optional-index eviction");
  const receipt = frames.capture(state);
  check(receipt.code === "ok", "cold captured prefix");
  const renderer = new GpuRenderer(canvas, 1024, 768);
  const cache = new PreparedCache(() => state);
  const before = { ...geometryMetrics };
  const turns: { hulls: number; queries: number; resolved: boolean; validated: number }[] = [];
  let resolved = false,
    stopped = false,
    timer = 0;
  const sample = () => {
    if (stopped) return;
    turns.push({
      hulls: geometryMetrics.visibilityHulls - before.visibilityHulls,
      queries: geometryMetrics.visibilityQueries - before.visibilityQueries,
      validated: geometryMetrics.validatedSubmissions - before.validatedSubmissions,
      resolved,
    });
    if (turns.length < 2048) timer = window.setTimeout(sample, 0);
  };
  timer = window.setTimeout(sample, 0);
  try {
    const built = await buildFrame(
      () => state,
      cache,
      renderer,
      receipt,
      1,
      () => true,
      new AbortController().signal,
    );
    resolved = true;
    check(built, "current frame validates after traversal");
    check(turns.length < 2048, "bounded task observation completed");
    const after = { ...geometryMetrics };
    const intermediate = turns.filter((v) => v.hulls > 0 && v.hulls < 513);
    check(
      new Set(intermediate.map((v) => v.hulls)).size > 1,
      "cold traversal crosses actual task turns",
    );
    check(
      intermediate.every((v) => !v.resolved && v.validated === 0),
      "no completion or GPU validation during incomplete traversal",
    );
    check(
      after.visibilityHulls - before.visibilityHulls === 513,
      "all513 cold chunk hulls visited",
    );
    check(
      after.visibilityQueries - before.visibilityQueries >= 129,
      "four-hull per-query work bound",
    );
    check(
      after.visibilityMaxHulls <= 4 && after.visibilityMaxVisits <= 512,
      "per-query bounds observed",
    );
    check(
      after.jobs === before.jobs &&
        after.workerPages === before.workerPages &&
        after.fallbackPages === before.fallbackPages,
      "culled chunks issue no geometry jobs",
    );
    check(after.visibilityBytes === before.visibilityBytes, "copied reply arrays released");
    const gl = renderer.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderer.resources.staging.framebuffer);
    const pixels = new Uint8Array(1024 * 768 * 4);
    gl.readPixels(0, 0, 1024, 768, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    check(
      pixels.every((v, i) => i % 4 === 3 || v === 255),
      "validated all-culled frame is visibly blank",
    );
    state = frames.ready(state, receipt.id);
    check(state.code === "ok" || state.code === "noop", "ack only after validated current pixels");
    return {
      ...report(),
      stimulus: "optional-index eviction; real host producer/task scheduling",
      before,
      after,
      turns,
    };
  } finally {
    stopped = true;
    clearTimeout(timer);
    frames.release(state, receipt.id);
    cache.dispose();
    closeTailFixture(state);
    await retireRenderer(renderer);
  }
}
