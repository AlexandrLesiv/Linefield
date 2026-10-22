import type { allocateGpu } from "./gpu-allocation.ts";
import type { GpuArena } from "./gpu-arena.ts";
import { GpuPass, blit } from "./gpu-pass.ts";
export class LiveGpu {
  readonly stable: GpuPass;
  tail: GpuPass;
  private gl: WebGL2RenderingContext;
  private r: ReturnType<typeof allocateGpu>;
  private width: number;
  private height: number;
  private arena: GpuArena;
  constructor(
    gl: WebGL2RenderingContext,
    r: ReturnType<typeof allocateGpu>,
    width: number,
    height: number,
    arena: GpuArena,
  ) {
    this.gl = gl;
    this.r = r;
    this.width = width;
    this.height = height;
    this.arena = arena;
    this.stable = new GpuPass(gl, r, r.mask, null, width, height, arena);
    this.tail = new GpuPass(gl, r, r.overlayMask, null, width, height, arena);
  }
  resetTail() {
    this.tail = new GpuPass(
      this.gl,
      this.r,
      this.r.overlayMask,
      null,
      this.width,
      this.height,
      this.arena,
    );
  }
  display(color: readonly number[], matrix?: Float32Array, combine = true) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    blit(
      gl,
      this.r,
      this.r.mask.texture,
      this.width,
      this.height,
      color,
      matrix,
      false,
      combine ? this.r.overlayMask.texture : undefined,
    );
  }
  stage(color: readonly number[]) {
    const gl = this.gl,
      r = this.r;
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.staging.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, !r.packed);
    gl.disable(gl.BLEND);
    blit(gl, r, r.base.texture, this.width, this.height);
    // Packed fallback copies the completed stable mask into base alpha only. The tail
    // is now obsolete; no paused candidate or other live mask is allowed to coexist.
    let texture = r.mask.texture;
    if (r.packed) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, r.base.framebuffer);
      gl.colorMask(false, false, false, true);
      blit(gl, r, texture, this.width, this.height, undefined, undefined, true);
      texture = r.base.texture;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.staging.framebuffer);
    gl.colorMask(true, true, true, !r.packed);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    blit(gl, r, texture, this.width, this.height, color);
  }
}
