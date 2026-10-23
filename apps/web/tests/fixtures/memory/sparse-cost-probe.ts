import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
export function sparseCostProbe(renderer: GpuRenderer) {
  const gl = renderer.gl;
  const bind = gl.bindFramebuffer.bind(gl),
    enable = gl.enable.bind(gl),
    disable = gl.disable.bind(gl);
  const scissor = gl.scissor.bind(gl),
    clear = gl.clear.bind(gl),
    fence = gl.fenceSync.bind(gl);
  let target: WebGLFramebuffer | null = null,
    clipped = false,
    area = 0;
  const counts = { fullGClearPixels: 0, scissoredGClearPixels: 0, fences: 0 };
  gl.bindFramebuffer = (mode, value) => {
    if (mode === gl.FRAMEBUFFER || mode === gl.DRAW_FRAMEBUFFER) target = value;
    bind(mode, value);
  };
  gl.enable = (mode) => {
    if (mode === gl.SCISSOR_TEST) clipped = true;
    enable(mode);
  };
  gl.disable = (mode) => {
    if (mode === gl.SCISSOR_TEST) clipped = false;
    disable(mode);
  };
  gl.scissor = (x, y, width, height) => {
    area = width * height;
    scissor(x, y, width, height);
  };
  gl.clear = (mask) => {
    if (target === renderer.resources.mask.framebuffer && mask & gl.COLOR_BUFFER_BIT) {
      if (clipped) counts.scissoredGClearPixels += area;
      else counts.fullGClearPixels += renderer.width * renderer.height;
    }
    clear(mask);
  };
  gl.fenceSync = (condition, flags) => {
    counts.fences++;
    return fence(condition, flags);
  };
  return {
    counts,
    reset: () => {
      counts.fullGClearPixels = 0;
      counts.scissoredGClearPixels = 0;
      counts.fences = 0;
    },
    close: () => {
      gl.bindFramebuffer = bind;
      gl.enable = enable;
      gl.disable = disable;
      gl.scissor = scissor;
      gl.clear = clear;
      gl.fenceSync = fence;
    },
  };
}
