import { blit } from "./gpu-blit.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
export function presentBase(
  renderer: GpuRenderer,
  matrix: Float32Array | undefined,
  base: boolean,
) {
  const gl = renderer.gl;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  gl.colorMask(true, true, true, true);
  gl.clearColor(1, 1, 1, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (base)
    blit(
      gl,
      renderer.resources,
      renderer.resources.base.texture,
      renderer.width,
      renderer.height,
      undefined,
      matrix,
    );
}
