import { LiveGpu } from "./live-gpu.ts";
import { GpuSubmission } from "./gpu-submission.ts";
import { allocateGpu } from "./gpu-allocation.ts";
import { GpuArena } from "./gpu-arena.ts";
import { GpuPass, blit } from "./gpu-pass.ts";
import { gpuAdmission, retireGpu } from "./gpu-retirement.ts";
import type { CpuRetirement } from "./gpu-retirement.ts";
import type { ResidencyToken } from "./residency.ts";
let resourceEpoch = 0;
export class GpuRenderer {
  readonly epoch = ++resourceEpoch;
  readonly gl: WebGL2RenderingContext;
  readonly resources: ReturnType<typeof allocateGpu>;
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  private arena: GpuArena;
  private pass: GpuPass;
  private submissions: GpuSubmission;
  private disposed = false;
  constructor(canvas: HTMLCanvasElement, width: number, height: number, backing = 1) {
    if (!gpuAdmission()) throw Error("gpu-retirement");
    width = Math.ceil(width * backing);
    height = Math.ceil(height * backing);
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (!gl) throw Error("gpu-unavailable");
    for (const stage of [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER]) {
      const p = gl.getShaderPrecisionFormat(stage, gl.HIGH_FLOAT);
      if (!p || p.precision < 23 || p.rangeMax < 127) throw Error("gpu-unavailable");
    }
    this.gl = gl;
    this.submissions = new GpuSubmission(gl);
    canvas.width = width;
    canvas.height = height;
    this.resources = allocateGpu(gl, width, height);
    const scratch = this.resources.buffers[0];
    if (!scratch) throw Error("gpu-buffer");
    this.arena = new GpuArena(gl, scratch, this.resources.bytes);
    try {
      this.pass = new GpuPass(
        gl,
        this.resources,
        this.resources.mask,
        this.resources.staging.framebuffer,
        width,
        height,
        this.arena,
      );
      gl.viewport(0, 0, width, height);
      if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw Error("gpu-resource");
    } catch (e) {
      this.dispose();
      throw e;
    }
  }
  begin(clear = true) {
    const gl = this.gl;
    this.arena.begin();
    this.pass = new GpuPass(
      gl,
      this.resources,
      this.resources.mask,
      this.resources.staging.framebuffer,
      this.width,
      this.height,
      this.arena,
    );
    if (!clear) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.resources.staging.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, !this.resources.packed);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  protect() {
    return this.arena.protect();
  }
  unprotect(token: ResidencyToken, accepted: boolean) {
    this.arena.unprotect(token, accepted);
  }
  group() {
    this.pass.group();
  }
  draw(data: Float32Array, matrix: Float32Array, color: readonly number[], page = 0n) {
    this.pass.draw(data, matrix, color, page);
  }
  composite() {
    this.pass.composite();
  }
  promote() {
    const old = this.resources.base;
    this.resources.base = this.resources.staging;
    this.resources.staging = old;
  }
  live() {
    return new LiveGpu(this.gl, this.resources, this.width, this.height, this.arena);
  }
  overlay(matrix?: Float32Array, base = true, clearMask = true) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    gl.colorMask(true, true, true, true);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (base)
      blit(
        gl,
        this.resources,
        this.resources.base.texture,
        this.width,
        this.height,
        undefined,
        matrix,
      );
    return new GpuPass(
      gl,
      this.resources,
      clearMask ? this.resources.overlayMask : this.resources.backMask,
      null,
      this.width,
      this.height,
      this.arena,
      clearMask,
    );
  }
  publish() {
    this.check();
    this.promote();
    this.overlay();
    this.check();
  }
  available() {
    const ready = this.submissions.acquire();
    if (ready && this.submissions.idle) this.arena.maintain();
    return ready;
  }
  async slot() {
    while (!this.available()) await this.submissions.turn();
  }
  check() {
    return this.submissions.submit();
  }
  validated(serial: number) {
    return this.submissions.wait(serial);
  }
  dispose(cpu?: CpuRetirement) {
    if (this.disposed) return;
    let started = false;
    retireGpu(
      {
        bytes: this.resources.bytes + 256 * 1024 + this.arena.bytes,
        metadata: () => this.arena.metadataEstimate,
        context: this.gl,
        drained: () => {
          if (this.gl.isContextLost()) return true;
          if (!started) {
            this.submissions.retire();
            started = true;
          }
          return this.submissions.drained();
        },
        release: () => {
          this.submissions.dispose();
          this.arena.dispose();
          this.resources.dispose();
        },
      },
      cpu,
    );
    this.arena.stop();
    this.disposed = true;
  }
}
