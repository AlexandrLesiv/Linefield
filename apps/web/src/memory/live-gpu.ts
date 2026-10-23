import type { allocateGpu } from "./gpu-allocation.ts";
import type { GpuArena } from "./gpu-arena.ts";
import { GpuPass, blit } from "./gpu-pass.ts";
export class LiveGpu {
  readonly stable: GpuPass;
  tail: GpuPass;
  back: GpuPass;
  private gl: WebGL2RenderingContext;
  private r: ReturnType<typeof allocateGpu>;
  private width: number;
  private height: number;
  private arena: GpuArena;
  private stableTarget: ReturnType<typeof allocateGpu>["mask"];
  private frontTarget: ReturnType<typeof allocateGpu>["mask"];
  private backTarget: ReturnType<typeof allocateGpu>["mask"];
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
    this.stableTarget = r.packed ? r.base : r.liveMask;
    this.frontTarget = r.packed ? r.staging : r.overlayMask;
    this.backTarget = r.packed ? r.scratch : r.backMask;
    this.stable = new GpuPass(gl, r, this.stableTarget, null, width, height, arena);
    this.tail = new GpuPass(gl, r, this.frontTarget, null, width, height, arena);
    this.back = new GpuPass(gl, r, this.backTarget, null, width, height, arena);
  }
  clearFront() {
    this.tail = new GpuPass(
      this.gl,
      this.r,
      this.frontTarget,
      null,
      this.width,
      this.height,
      this.arena,
    );
  }
  resetBack() {
    this.back = new GpuPass(
      this.gl,
      this.r,
      this.backTarget,
      null,
      this.width,
      this.height,
      this.arena,
    );
  }
  publishBack() {
    this.clearFront();
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.frontTarget.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(!this.r.packed, !this.r.packed, !this.r.packed, true);
    gl.disable(gl.BLEND);
    blit(gl, this.r, this.backTarget.texture, this.width, this.height, undefined, undefined, true);
  }
  display(
    color: readonly number[],
    matrix?: Float32Array,
    combine = true,
    destination: WebGLFramebuffer | null = null,
  ) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, !(destination && this.r.packed));
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    blit(
      gl,
      this.r,
      this.stableTarget.texture,
      this.width,
      this.height,
      color,
      matrix,
      false,
      combine ? this.frontTarget.texture : undefined,
    );
  }
}
