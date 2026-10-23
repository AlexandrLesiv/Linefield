import { AnchorMiss } from "./placement-phase.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { RegionRead } from "./gpu-regions.ts";
import { scissor } from "./gpu-scissor.ts";
/** Caller owns an admitted slot and submits its serial even if no dirty geometry follows. */
export function copyRegion(renderer: GpuRenderer, region: RegionRead) {
  if (!region.valid()) throw new AnchorMiss("source");
  const { gl, resources: r, width, height } = renderer;
  if (r.base.texture === r.staging.texture) throw Error("gpu-feedback");
  gl.bindFramebuffer(gl.FRAMEBUFFER, r.staging.framebuffer);
  gl.viewport(0, 0, width, height);
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  gl.colorMask(true, true, true, !r.packed);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  scissor(gl, region.overlap, width, height);
  gl.useProgram(r.seed);
  gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, r.base.texture);
  gl.uniform1i(gl.getUniformLocation(r.seed, "image"), 0);
  gl.uniform2i(gl.getUniformLocation(r.seed, "shift"), region.shift[0], -region.shift[1]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
