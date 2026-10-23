import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { CompletedCandidate } from "../../../src/memory/completed-candidate.ts";
import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { DisplayBase } from "../../../src/memory/display-base.ts";
import { ReceiptLeases } from "../../../src/memory/receipt-lease.ts";
import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { queryReady } from "./query-readiness.ts";
import { closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
import { farRaster } from "./raster-bindings.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
export type RegionOptions = {
  backing?: number;
  zoom?: number;
  angle?: number;
  far?: boolean;
  width?: number;
  height?: number;
  translucent?: boolean;
  cacheClass?: typeof PreparedCache;
  interior?: boolean;
  strokes?: number;
  broad?: boolean;
  edge?: boolean;
};
export async function regionFixture(canvas: HTMLCanvasElement, options: RegionOptions = {}) {
  const { backing = 1, zoom = 1, angle = 0, far = false, width = 256, height = 192 } = options;
  if (far) farRaster();
  let state = bridge.create();
  state = queryReady(bridge.metrics(bridge.enter(state.owner), 1n, width, height, backing));
  state = edit.view(state, zoom, width / 2, height / 2, false);
  if (angle) state = edit.view(state, angle, width / 2, height / 2, true);
  state = queryReady(bridge.read(state.owner));
  state = edit.style(state, (options.broad ? 1 : 12) / zoom, [
    0.2,
    0.4,
    0.7,
    options.translucent ? 0.35 : 1,
  ]);
  for (let i = 0; i < (options.strokes ?? 8); i++) {
    const x = options.edge
      ? 1
      : options.interior
        ? 40 + (i % 4) * 40
        : i < 4
          ? 40 + i * 40
          : i % 2
            ? -12
            : width + 12;
    state = edit.begin(
      state,
      1,
      options.broad ? -200 : x,
      options.broad ? height / 2 : 25,
      0.5,
      true,
    );
    state = edit.append(
      state,
      1n,
      new Float64Array([options.broad ? 600 : x + 5]),
      new Float64Array([options.broad ? height / 2 : height - 25]),
      new Float64Array([0.5]),
      new Uint8Array([1]),
    );
    state = edit.end(state, 2n);
    if (state.code !== "ok") throw Error(`region setup ${state.code}`);
  }
  if (options.broad) state = queryReady(edit.view(state, 1, width / 2, height / 2, false));
  const renderer = new GpuRenderer(canvas, width, height, backing);
  const cache = new (options.cacheClass ?? PreparedCache)(() => state),
    leases = new ReceiptLeases();
  const base = new DisplayBase(() => state, leases),
    errors: unknown[] = [];
  const candidate = new CompletedCandidate(
    () => state,
    cache,
    renderer,
    () => {},
    (e) => errors.push(e),
  );
  const detail = bridge.mapping(state.owner, state.session).zoom * backing;
  const idle = async (retry = false) => {
    const deadline = performance.now() + 10000;
    for (;;) {
      if (errors.length) throw errors[0];
      if (!candidate.busy) {
        if (!retry || candidate.ready) return;
        candidate.start(detail);
      }
      if (performance.now() > deadline) throw Error("region candidate timeout");
      await new Promise<void>((resolve) => setTimeout(resolve, 4));
    }
  };
  const promote = () => {
    const next = candidate.take();
    if (!next) throw Error("region candidate missing");
    renderer.promote();
    base.publish(next, renderer, true);
    state = frames.ready(state, next.id);
    if (state.code !== "ok" && state.code !== "noop")
      throw Error(`region acknowledgement ${state.code}`);
    return next;
  };
  const start = () => {
    const source = base.seedSource(renderer);
    if (source) candidate.seed(detail, source);
    candidate.start(detail);
  };
  candidate.start(detail);
  await idle(true);
  promote();
  return {
    renderer,
    cache,
    base,
    candidate,
    leases,
    errors,
    detail,
    idle,
    promote,
    start,
    state: () => state,
    update: (next: typeof state) => (state = next),
    pan: (x: number, y = 0, end = true) => {
      state = edit.panBegin(state, 2, 0, 0, false);
      if (state.code !== "ok") throw Error(`region pan begin ${state.code}`);
      const token = state;
      state = edit.panUpdate(token, 1n, x, y, false);
      if (state.code !== "ok") throw Error(`region pan update ${state.code}`);
      if (end) state = edit.panEnd(token, 1n);
      if (state.code !== "ok") throw Error(`region pan end ${state.code}`);
    },
    pixels: () => {
      const gl = renderer.gl;
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderer.resources.staging.framebuffer);
      const data = new Uint8Array(renderer.width * renderer.height * 4);
      gl.readPixels(0, 0, renderer.width, renderer.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return data;
    },
    close: async () => {
      await candidate.dispose();
      cache.dispose();
      base.dispose();
      await retireRenderer(renderer);
      leases.drained();
      closeTailFixture(state);
    },
  };
}
