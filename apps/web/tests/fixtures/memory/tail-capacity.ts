import { tailFixture, appendTailPoints, assertions, closeTailFixture } from "./tail-fixture.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { currentCoverage } from "../../../src/memory/current-coverage.ts";
import { loadPreparation } from "../../../src/memory/preparation-loader.ts";
import { LiveCoverage } from "../../../src/memory/live-coverage.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function tailCapacity(canvas: HTMLCanvasElement) {
  const { check, report } = assertions();
  const f = tailFixture(33);
  let state = f.state;
  const renderer = new GpuRenderer(canvas, 1024, 768);
  const owner = new LiveCoverage(
    f.stroke,
    f.frame,
    1,
    renderer.live(),
    () => state,
    await loadPreparation(),
  );
  const color = [0, 0, 0, 1];
  const ids: bigint[] = [];
  let pixels = new Uint8Array();
  const draw = async (count: bigint) => {
    await renderer.slot();
    owner.advance(count, color, true);
    renderer.overlay(undefined, false, false);
    owner.gpu.display(color);
    pixels = new Uint8Array(1024 * 768 * 4);
    renderer.gl.bindFramebuffer(renderer.gl.READ_FRAMEBUFFER, null);
    renderer.gl.readPixels(0, 0, 1024, 768, renderer.gl.RGBA, renderer.gl.UNSIGNED_BYTE, pixels);
    await renderer.validated(renderer.check());
  };
  try {
    for (let i = 0; i < 7; i++) {
      const frame = frames.capture(state);
      check(frame.code === "ok", "fill combined frame slots");
      ids.push(frame.id);
    }
    await draw(33n);
    check(!owner.covers(33n), "full slots defer optional tail");
    check(
      currentCoverage(state, f.frame).liveState === "active",
      "capacity does not cancel canonical input",
    );
    frames.release(state, ids.pop()!);
    for (let i = 0; i < 32 && !owner.covers(33n); i++) await draw(33n);
    check(owner.covers(33n), "released slot permits visible current front");
    const front = pixels;
    check(
      front.some((v, i) => i % 4 === 0 && v < 80),
      "front has positively visible ink",
    );
    state = appendTailPoints(state, 33, 1);
    check(state.code === "ok", "input continues with front and all slots charged");
    await draw(34n);
    check(
      pixels.every((v, i) => v === front[i]),
      "full-slot append preserves every front pixel",
    );
    check(
      !owner.covers(34n) && owner.covers(33n) === false,
      "old front not miscertified after append",
    );
    check(currentCoverage(state, f.frame).liveCount === 34n, "accepted raw point retained");
    frames.release(state, ids.pop()!);
    for (let i = 0; i < 32 && !owner.covers(34n); i++) await draw(34n);
    check(owner.covers(34n), "fresh back advances after second release");
    return { ...report(), packed: renderer.resources.packed };
  } finally {
    owner.dispose();
    frames.release(state, f.frame);
    for (const id of ids) frames.release(state, id);
    closeTailFixture(state);
    await retireRenderer(renderer);
  }
}
