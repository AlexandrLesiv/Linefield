import { allocateGpu } from "./gpu-allocation.ts";
import { emptyBounds, pageBounds, union, scissor } from "./gpu-scissor.ts";
export class GpuRenderer {
  readonly gl: WebGL2RenderingContext;
  readonly resources: ReturnType<typeof allocateGpu>;
  private groupBounds = emptyBounds();
  private previousBounds = emptyBounds();
  private stream = 0;
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
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
      const precision = gl.getShaderPrecisionFormat(stage, gl.HIGH_FLOAT);
      if (!precision || precision.precision < 23 || precision.rangeMax < 127)
        throw Error("gpu-unavailable");
    }
    this.gl = gl;
    canvas.width = width;
    canvas.height = height;
    this.resources = allocateGpu(gl, width, height);
    try {
      gl.viewport(0, 0, width, height);
      this.check();
    } catch (error) {
      this.resources.dispose();
      throw error;
    }
  }
  begin() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.resources.staging.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  group() {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.resources.mask.framebuffer);
    scissor(gl, this.previousBounds, this.width, this.height);
    this.groupBounds = emptyBounds();
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.blendFunc(gl.ONE, gl.ONE);
  }
  draw(data: Float32Array, m: Float32Array, color: readonly number[]) {
    const gl = this.gl;
    gl.useProgram(this.resources.ink);
    gl.bindVertexArray(this.resources.vao);
    const bounds = pageBounds(data, m);
    union(this.groupBounds, bounds);
    scissor(gl, bounds, this.width, this.height);
    const buffer = this.resources.buffers[this.stream++ % 2];
    if (!buffer) throw Error("gpu-buffer");
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    for (let i = 0; i < 2; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 24, i * 12);
      gl.vertexAttribDivisor(i, 1);
    }
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
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
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.resources.staging.framebuffer);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.blit(this.resources.mask.texture);
  }
  publish() {
    const gl = this.gl;
    this.check();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.BLEND);
    this.blit(this.resources.staging.texture);
    this.check();
  }
  private blit(texture: WebGLTexture) {
    const gl = this.gl;
    gl.useProgram(this.resources.copy);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(gl.getUniformLocation(this.resources.copy, "image"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  private check() {
    if (this.gl.isContextLost() || this.gl.getError() !== this.gl.NO_ERROR)
      throw Error("gpu-resource");
  }
  dispose() {
    this.resources.dispose();
  }
}
