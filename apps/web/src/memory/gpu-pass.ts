import type { allocateGpu } from "./gpu-allocation.ts";
import type { target } from "./gpu-resources.ts";
import { emptyBounds, pageBounds, union, scissor } from "./gpu-scissor.ts";
import { GpuArena } from "./gpu-arena.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { resampleOpaque } from "./opaque-sampler.ts";
type Resources = ReturnType<typeof allocateGpu>;
export function blit(
  gl: WebGL2RenderingContext,
  r: Resources,
  texture: WebGLTexture,
  width: number,
  height: number,
  color?: readonly number[],
  matrix?: Float32Array,
  alphaOnly = false,
  second?: WebGLTexture,
) {
  gl.useProgram(r.copy);
  gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.uniform1i(gl.getUniformLocation(r.copy, "image"), 0);
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, second ?? texture);
  gl.uniform1i(gl.getUniformLocation(r.copy, "secondImage"), 1);
  gl.uniform1i(gl.getUniformLocation(r.copy, "combine"), second ? 1 : 0);
  gl.uniform1i(gl.getUniformLocation(r.copy, "coverage"), color ? 1 : 0);
  gl.uniform1i(gl.getUniformLocation(r.copy, "alphaOnly"), alphaOnly ? 1 : 0);
  gl.uniform1i(gl.getUniformLocation(r.copy, "packedMask"), r.packed ? 1 : 0);
  gl.uniform4fv(gl.getUniformLocation(r.copy, "groupColor"), color ?? [0, 0, 0, 1]);
  gl.uniform2f(gl.getUniformLocation(r.copy, "viewport"), width, height);
  gl.uniformMatrix3fv(
    gl.getUniformLocation(r.copy, "transform"),
    false,
    matrix
      ? new Float32Array([
          matrix[0] ?? 1,
          matrix[1] ?? 0,
          0,
          matrix[2] ?? 0,
          matrix[3] ?? 1,
          0,
          matrix[4] ?? 0,
          matrix[5] ?? 0,
          1,
        ])
      : new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]),
  );
  // Mask/MAX/live composition keeps the texture's exact NEAREST sampling. Only
  // transformed opaque RGB images use this sampler; packed alpha is not displayed.
  try {
    gl.bindSampler(0, !color && !alphaOnly && resampleOpaque(matrix) ? r.rgbSampler : null);
    gl.bindSampler(1, null);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  } finally {
    gl.bindSampler(0, null);
    gl.bindSampler(1, null);
  }
}
export class GpuPass {
  private groupBounds = emptyBounds();
  private previousBounds = emptyBounds();
  private color: readonly number[] = [0, 0, 0, 1];
  private stream = 0;
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
  group() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.mask.framebuffer);
    gl.colorMask(!this.resources.packed, !this.resources.packed, !this.resources.packed, true);
    scissor(gl, this.previousBounds, this.width, this.height);
    this.groupBounds = emptyBounds();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  draw(data: Float32Array, m: Float32Array, color: readonly number[], page = 0n) {
    if (!data.length) return;
    const gl = this.gl;
    this.color = color;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.mask.framebuffer);
    gl.colorMask(!this.resources.packed, !this.resources.packed, !this.resources.packed, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(this.resources.ink);
    gl.bindVertexArray(this.resources.vao);
    const bounds = pageBounds(data, m);
    union(this.groupBounds, bounds);
    scissor(gl, bounds, this.width, this.height);
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
    gl.uniform2f(gl.getUniformLocation(this.resources.ink, "viewport"), this.width, this.height);
    gl.uniform4fv(gl.getUniformLocation(this.resources.ink, "color"), color);
    gl.uniformMatrix3fv(
      gl.getUniformLocation(this.resources.ink, "placement"),
      false,
      new Float32Array([m[0] ?? 0, m[1] ?? 0, 0, m[2] ?? 0, m[3] ?? 0, 0, m[4] ?? 0, m[5] ?? 0, 1]),
    );
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, data.length / 6);
  }
  composite() {
    const gl = this.gl;
    this.previousBounds = this.groupBounds;
    scissor(gl, this.groupBounds, this.width, this.height);
    const texture = this.mask.texture;
    if (this.destination === this.mask.framebuffer) throw Error("gpu-feedback");
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.destination);
    gl.colorMask(true, true, true, !(this.resources.packed && this.destination));
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    blit(gl, this.resources, texture, this.width, this.height, this.color);
  }
}
