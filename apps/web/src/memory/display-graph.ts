import { blit } from "./gpu-pass.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { LiveGpu } from "./live-gpu.ts";
export type DisplayGraph = {
  base: Float32Array | undefined;
  candidate: Float32Array | undefined;
  live:
    | { gpu: LiveGpu; color: readonly number[]; matrix: Float32Array; active: boolean }
    | undefined;
  candidateIncludesLive: boolean;
};
function colorLayer(renderer: GpuRenderer, texture: WebGLTexture, matrix: Float32Array) {
  const { gl, resources: r, width, height } = renderer;
  gl.disable(gl.BLEND);
  blit(gl, r, texture, width, height, undefined, matrix);
}
export function displayGraph(renderer: GpuRenderer, graph: DisplayGraph, scratch = false) {
  const { gl, resources: r } = renderer;
  const destination = scratch ? r.scratch.framebuffer : null;
  gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  gl.colorMask(true, true, true, !(scratch && r.packed));
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (graph.base) colorLayer(renderer, r.base.texture, graph.base);
  const live = graph.live;
  const before = live && !live.active && graph.candidateIncludesLive;
  if (before) live.gpu.display(live.color, live.matrix, true, destination);
  if (graph.candidate) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
    gl.colorMask(true, true, true, !(scratch && r.packed));
    colorLayer(renderer, r.staging.texture, graph.candidate);
  }
  if (live && !before && (!scratch || !live.active))
    live.gpu.display(live.color, live.matrix, true, destination);
}
export function consumeGraph(renderer: GpuRenderer, graph: DisplayGraph) {
  const { gl, resources: r, width, height } = renderer;
  displayGraph(renderer, graph, true);
  if (graph.live?.active) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.base.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.colorMask(true, true, true, !r.packed);
    blit(gl, r, r.scratch.texture, width, height);
  } else {
    const old = r.base;
    r.base = r.scratch;
    r.scratch = old;
  }
}
