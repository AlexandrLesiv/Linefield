import type { allocateGpu } from "./gpu-allocation.ts";
import type { target } from "./gpu-resources.ts";
import { emptyBounds, pageBounds, union, scissor } from "./gpu-scissor.ts";
import { GpuArena } from "./gpu-arena.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { blit } from "./gpu-blit.ts";
export { blit } from "./gpu-blit.ts";
import { intersections } from "./gpu-regions.ts";
import type { Bounds } from "./gpu-scissor.ts";
export type DrawPlan = { bounds: Bounds; clips: Bounds[] };
type Resources = ReturnType<typeof allocateGpu>;
export class GpuPass {
  private groupBounds = emptyBounds();
  private previousBounds = emptyBounds();
  private color: readonly number[] = [0, 0, 0, 1];
  private stream = 0;
  private regions: readonly Bounds[] | undefined;
  private gl: WebGL2RenderingContext;
  private resources: Resources;
  private mask: ReturnType<typeof target>;
  private destination: WebGLFramebuffer | null;
  private width: number;
  private height: number;
  private arena: GpuArena;
  constructor(
    gl: WebGL2RenderingContext,
    resources: Resources,
    mask: ReturnType<typeof target>,
    destination: WebGLFramebuffer | null,
    width: number,
    height: number,
    arena: GpuArena,
    clear = true,
  ) {
    this.gl = gl;
    this.resources = resources;
    this.mask = mask;
    this.destination = destination;
    this.width = width;
    this.height = height;
    this.arena = arena;
    if (!clear) return;
    gl.bindFramebuffer(gl.FRAMEBUFFER, mask.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(!resources.packed, !resources.packed, !resources.packed, true);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  setRegions(regions: readonly Bounds[] | undefined) {
    this.regions = regions;
  }
  plan(data: Float32Array, m: Float32Array, offset: readonly [number, number] = [0, 0]): DrawPlan {
    const bounds = pageBounds(data, m);
    bounds[0] += offset[0];
    bounds[2] += offset[0];
    bounds[1] += offset[1];
    bounds[3] += offset[1];
    return { bounds, clips: this.regions ? intersections(bounds, this.regions) : [bounds] };
  }
  compositePlan() {
    return this.regions ? intersections(this.groupBounds, this.regions) : [this.groupBounds];
  }
  group() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.mask.framebuffer);
    gl.colorMask(!this.resources.packed, !this.resources.packed, !this.resources.packed, true);
    const clears = this.regions
      ? intersections(this.previousBounds, this.regions)
      : [this.previousBounds];
    this.groupBounds = emptyBounds();
    gl.clearColor(0, 0, 0, 0);
    for (const bounds of clears) {
      scissor(gl, bounds, this.width, this.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }
  draw(
    data: Float32Array,
    m: Float32Array,
    color: readonly number[],
    page = 0n,
    offset: readonly [number, number] = [0, 0],
    plan = this.plan(data, m, offset),
  ) {
    if (!data.length || !plan.clips.length) return 0;
    if (!this.resources.integerQuad && (offset[0] !== 0 || offset[1] !== 0))
      throw Error("raster-capability");
    const gl = this.gl;
    this.color = color;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.mask.framebuffer);
    gl.colorMask(!this.resources.packed, !this.resources.packed, !this.resources.packed, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.resources.ink);
    gl.bindVertexArray(this.resources.vao);
    union(this.groupBounds, plan.bounds);
    const retained = page ? this.arena.get(page, data) : undefined;
    const buffer = retained?.buffer ?? this.resources.buffers[this.stream++ % 2];
    if (!buffer) throw Error("gpu-buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (let i = 0; i < 2; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 24, (retained?.offset ?? 0) + i * 12);
      gl.vertexAttribDivisor(i, 1);
    }
    if (!retained) {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
      metrics.gpuUploads++;
      metrics.gpuUploadBytes += data.byteLength;
      metrics.gpuStreamUploads++;
      metrics.gpuStreamUploadBytes += data.byteLength;
    }
    gl.uniform1i(
      gl.getUniformLocation(this.resources.ink, "integerQuad"),
      this.resources.integerQuad ? 1 : 0,
    );
    gl.uniform2f(gl.getUniformLocation(this.resources.ink, "viewport"), this.width, this.height);
    gl.uniform4fv(gl.getUniformLocation(this.resources.ink, "color"), color);
    gl.uniform2f(gl.getUniformLocation(this.resources.ink, "integerOffset"), offset[0], offset[1]);
    gl.uniformMatrix3fv(
      gl.getUniformLocation(this.resources.ink, "placement"),
      false,
      new Float32Array([m[0] ?? 0, m[1] ?? 0, 0, m[2] ?? 0, m[3] ?? 0, 0, m[4] ?? 0, m[5] ?? 0, 1]),
    );
    for (const clip of plan.clips) {
      scissor(gl, clip, this.width, this.height);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, data.length / 6);
    }
    return plan.clips.length;
  }
  composite(clips = this.compositePlan()) {
    const gl = this.gl;
    this.previousBounds = this.groupBounds;

    const texture = this.mask.texture;
    if (this.destination === this.mask.framebuffer) throw Error("gpu-feedback");
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.destination);
    gl.colorMask(true, true, true, !(this.resources.packed && this.destination));
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    for (const clip of clips) {
      scissor(gl, clip, this.width, this.height);
      blit(gl, this.resources, texture, this.width, this.height, this.color);
    }
    return clips.length;
  }
}
