import { CompletedCandidate } from "../../../src/memory/completed-candidate.ts";
import { DisplayBase } from "../../../src/memory/display-base.ts";
import { ReceiptLeases } from "../../../src/memory/receipt-lease.ts";
import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { LiveOwner } from "../../../src/memory/live-owner.ts";
import { currentCoverage } from "../../../src/memory/current-coverage.ts";
import { consumePrefix } from "../../../src/memory/consume-prefix.ts";
import { visibilityState, visibilityStroke } from "./visibility-fixture.ts";
import { closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function seedFixture(canvas: HTMLCanvasElement) {
  let state = visibilityStroke(visibilityState(), 1025);
  const renderer = new GpuRenderer(canvas, 1024, 768),
    cache = new PreparedCache(() => state),
    leases = new ReceiptLeases(),
    base = new DisplayBase(() => state, leases),
    live = new LiveOwner(() => state);
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
      if (performance.now() > deadline) throw Error("seed candidate timeout");
      await new Promise<void>((resolve) => setTimeout(resolve, 5));
    }
    if (errors.length) throw errors[0];
  };
  candidate.start(1);
  await idle();
  const prefix = candidate.take();
  if (!prefix) throw Error("actual prefix missing");
  renderer.promote();
  base.publish(prefix, renderer, true);
  return {
    renderer,
    cache,
    candidate,
    base,
    leases,
    prefix,
    idle,
    state: () => state,
    update: (next: typeof state) => {
      state = next;
    },
    append: (x = 450) => {
      state = visibilityStroke(state, 3, x);
    },
    seed: async () => {
      await renderer.slot();
      const q = currentCoverage(state, undefined, base.installed);
      if (
        !consumePrefix(
          () => state,
          renderer,
          base,
          candidate,
          live,
          () => ({
            base: base.transform(),
            candidate: undefined,
            live: undefined,
            candidateIncludesLive: false,
          }),
          q,
          1,
        )
      )
        throw Error("ordinary fold not admitted");
      return renderer.check();
    },
    pixels: () => {
      const { gl, resources } = renderer;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, resources.staging.framebuffer);
      const data = new Uint8Array(1024 * 768 * 4);
      gl.readPixels(0, 0, 1024, 768, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return data;
    },
    close: async () => {
      await candidate.dispose();
      cache.dispose();
      live.dispose();
      base.dispose();
      leases.drained();
      closeTailFixture(state);
      await retireRenderer(renderer);
    },
  };
}
