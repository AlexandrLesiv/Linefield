import { CompletedCandidate } from "../../../src/memory/completed-candidate.ts";
import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { currentCoverage } from "../../../src/memory/current-coverage.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { buildFrame } from "../../../src/memory/frame-builder.ts";
import { tailFixture, assertions, closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function candidateFailure(canvas: HTMLCanvasElement, afterIssue: boolean) {
  const { check, report } = assertions();
  const fixture = tailFixture(33);
  let state = edit.end(fixture.state, 33n);
  frames.release(state, fixture.frame);
  const renderer = new GpuRenderer(canvas, 1024, 768);
  const cache = new PreparedCache(() => state);
  const errors: unknown[] = [];
  const candidate = new CompletedCandidate(
    () => state,
    cache,
    renderer,
    () => {},
    (e) => errors.push(e),
  );
  const idle = async () => {
    const deadline = performance.now() + 5000;
    while (candidate.busy) {
      if (performance.now() > deadline) throw Error("candidate timeout");
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    check(errors.length === 0, "recoverable failure stays in normal scheduling");
  };
  const pixels = () => {
    const gl = renderer.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderer.resources.staging.framebuffer);
    const data = new Uint8Array(1024 * 768 * 4);
    gl.readPixels(0, 0, 1024, 768, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return data;
  };
  const sameRgb = (a: Uint8Array, b: Uint8Array) => a.every((v, i) => i % 4 === 3 || v === b[i]);
  const draw = renderer.draw.bind(renderer),
    composite = renderer.composite.bind(renderer);
  try {
    candidate.start(1);
    await idle();
    const predecessor = candidate.receipt;
    check(candidate.ready && !!predecessor, "validated predecessor ready");
    const before = pixels();
    state = edit.begin(state, 2, 600, 500, 0.5, true);
    state = edit.append(
      state,
      1n,
      new Float64Array([700]),
      new Float64Array([500]),
      new Float64Array([0.5]),
      new Uint8Array([1]),
    );
    state = edit.end(state, 2n);
    const source = currentCoverage(state).completedThrough;
    let injected = 0;
    if (afterIssue)
      renderer.composite = () => {
        composite();
        injected++;
        throw Error("stale-scene");
      };
    else
      renderer.draw = () => {
        injected++;
        throw Error("stale-scene");
      };
    candidate.extend(source, 1);
    await idle();
    check(injected === 1, "one bounded fault at specified phase");
    if (afterIssue) {
      check(!candidate.receipt && !candidate.ready, "possibly modified candidate discarded");
      check(!sameRgb(before, pixels()), "fault follows actual composite issue");
    } else {
      check(
        candidate.receipt?.id === predecessor?.id && candidate.ready,
        "valid predecessor retained",
      );
      check(sameRgb(before, pixels()), "pre-composite staging pixels unchanged");
    }
    renderer.draw = draw;
    renderer.composite = composite;
    if (afterIssue) candidate.start(1);
    else candidate.extend(source, 1);
    await idle();
    check(candidate.ready, "normal scheduling completes current candidate");
    const result = pixels();
    const exact = frames.capture(state);
    check(exact.code === "ok", "independent canonical receipt");
    try {
      check(
        await buildFrame(
          () => state,
          cache,
          renderer,
          exact,
          1,
          () => true,
          new AbortController().signal,
        ),
        "canonical rebuild complete",
      );
      check(sameRgb(result, pixels()), "recovery matches canonical once-only composition");
    } finally {
      frames.release(state, exact.id);
    }
    return { ...report(), afterIssue, packed: renderer.resources.packed };
  } finally {
    renderer.draw = draw;
    renderer.composite = composite;
    candidate.dispose();
    cache.dispose();
    closeTailFixture(state);
    await retireRenderer(renderer);
  }
}
