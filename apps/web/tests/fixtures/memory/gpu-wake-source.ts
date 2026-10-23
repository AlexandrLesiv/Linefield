import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import type { PreparedPage } from "../../../src/memory/prepared-cache.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { visibilityState, visibilityStroke } from "./visibility-fixture.ts";
import { closeTailFixture } from "./tail-fixture.ts";
import { retireRenderer } from "./retire-renderer.ts";
export async function gpuWakeSource(canvas: HTMLCanvasElement) {
  const state = visibilityStroke(visibilityState(), 129);
  const stroke = scene.ids(state, 0n).ids[0],
    receipt = frames.capture(state);
  if (!stroke || receipt.code !== "ok") throw Error("canonical GPU wake source");
  const cache = new PreparedCache(() => state);
  const pages: PreparedPage[] = [];
  for await (const page of cache.reader(stroke, 129n, 1, receipt.id, 0n)) pages.push(page);
  if (!pages.length) throw Error("actual prepared geometry missing");
  const renderer = new GpuRenderer(canvas, 1024, 768);
  const issue = () => {
    renderer.begin();
    renderer.group();
    for (const page of pages) {
      const placement = frames.placement(state, receipt.id, stroke, page.page);
      if (placement.code !== "ok" || !placement.available) throw Error("actual placement");
      renderer.draw(page.data, placement.matrix, [0, 0, 0, 1], page.page);
    }
    renderer.composite();
    return renderer.check();
  };
  const pixels = async () => {
    await renderer.slot();
    renderer.promote();
    renderer.overlay();
    await renderer.validated(renderer.check());
    const data = new Uint8Array(1024 * 768 * 4),
      gl = renderer.gl;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null);
    gl.readPixels(0, 0, 1024, 768, gl.RGBA, gl.UNSIGNED_BYTE, data);
    if (!["ok", "noop"].includes(frames.ready(state, receipt.id).code))
      throw Error("validated receipt");
    return data;
  };
  return {
    renderer,
    issue,
    pixels,
    resources: () => cache.resources(),
    releaseCpu: () => cache.dispose(),
    close: async () => {
      cache.dispose();
      frames.release(state, receipt.id);
      closeTailFixture(state);
      await retireRenderer(renderer);
    },
  };
}
