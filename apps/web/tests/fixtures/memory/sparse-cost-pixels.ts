import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
export function sparseCostPixels(renderer: GpuRenderer) {
  const gl = renderer.gl,
    pixels = new Uint8Array(renderer.width * renderer.height * 4);
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, renderer.resources.staging.framebuffer);
  gl.readPixels(0, 0, renderer.width, renderer.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  if (gl.getError() !== gl.NO_ERROR) throw Error("cost readback");
  if (renderer.resources.packed)
    for (let i = 3; i < pixels.length; i += 4)
      if (pixels[i] !== 96) throw Error("cost alpha sentinel");
  return pixels;
}
