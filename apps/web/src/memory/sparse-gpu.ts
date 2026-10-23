import { program } from "./gpu-resources.ts";
import {
  sparseVertex,
  sparseFragment,
  sparsePresentVertex,
  sparsePresentFragment,
} from "./sparse-shaders.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { SparsePlan } from "./sparse-plan.ts";
// Isolated proof executor only. Production keeps GpuPass; arena loans are not integrated.
export class SparseGpu {
  readonly routeBytes = 262144;
  private banks: WebGLTexture[] = [];
  private ink: WebGLProgram | undefined;
  private presenter: WebGLProgram | undefined;
  private prepared = 0;
  constructor(privateRenderer: GpuRenderer) {
    this.renderer = privateRenderer;
    const gl = privateRenderer.gl;
    try {
      for (let i = 0; i < 2; i++) {
        const texture = gl.createTexture();
        if (!texture) throw Error("sparse-route-allocation");
        this.banks.push(texture);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16I, 1024, 16);
      }
      this.ink = program(gl, sparseVertex, sparseFragment);
      this.presenter = program(gl, sparsePresentVertex, sparsePresentFragment);
      if (gl.getError() !== gl.NO_ERROR) throw Error("sparse-allocation");
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  private renderer: GpuRenderer;
  private table(plan: SparsePlan, bank: number, entries: number) {
    const gl = this.renderer.gl,
      texture = this.banks[bank];
    if (!texture) throw Error("sparse-bank");
    gl.activeTexture(gl.TEXTURE2);
    gl.bindSampler(2, null);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(
      gl.TEXTURE_2D,
      0,
      0,
      0,
      1024,
      Math.ceil(entries / 1024),
      gl.RGBA_INTEGER,
      gl.SHORT,
      plan.storage.routes,
      bank * 65536,
    );
  }
  geometry(
    plan: SparsePlan,
    data: Float32Array,
    matrix: Float32Array,
    color: readonly number[],
    descriptor: number,
  ) {
    const r = this.renderer,
      gl = r.gl,
      shader = this.ink;
    if (!shader || !r.resources.buffers[0]) throw Error("sparse-resources");
    const offset = descriptor * 8,
      d = plan.storage.descriptors;
    const first = d[offset] ?? 0,
      stride = d[offset + 3] ?? 0,
      instances = d[offset + 5] ?? 0;
    if (instances < 1 || instances > 4096 || stride < 1) throw Error("sparse-draw-bound");
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.resources.mask.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(!r.resources.packed, !r.resources.packed, !r.resources.packed, true);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.MAX);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(shader);
    gl.bindVertexArray(r.resources.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, r.resources.buffers[0]);
    if (descriptor === 0) {
      this.table(plan, 0, plan.routes.entries);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    }
    gl.activeTexture(gl.TEXTURE2);
    gl.bindSampler(2, null);
    gl.bindTexture(gl.TEXTURE_2D, this.banks[0] ?? null);
    const m = plan.storage.matrix;
    m[0] = matrix[0] ?? 0;
    m[1] = matrix[1] ?? 0;
    m[2] = 0;
    m[3] = matrix[2] ?? 0;
    m[4] = matrix[3] ?? 0;
    m[5] = 0;
    m[6] = matrix[4] ?? 0;
    m[7] = matrix[5] ?? 0;
    m[8] = 1;
    gl.uniformMatrix3fv(gl.getUniformLocation(shader, "placement"), false, m);
    gl.uniform2f(gl.getUniformLocation(shader, "viewport"), r.width, r.height);
    gl.uniform4fv(gl.getUniformLocation(shader, "color"), color);
    gl.uniform1i(gl.getUniformLocation(shader, "routeTable"), 2);
    gl.uniform3i(
      gl.getUniformLocation(shader, "routing"),
      d[offset + 2] ?? 0,
      stride,
      d[offset + 4] ?? 0,
    );
    try {
      for (let i = 0; i < 2; i++) {
        gl.enableVertexAttribArray(i);
        gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 24, first * 24 + i * 12);
        gl.vertexAttribDivisor(i, stride);
      }
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, instances);
    } finally {
      gl.vertexAttribDivisor(0, 1);
      gl.vertexAttribDivisor(1, 1);
    }
  }
  preparePresenter(plan: SparsePlan, budget: { deadline: number; remaining: number }) {
    const s = plan.storage,
      columns = Math.floor(this.renderer.width / 64);
    while (this.prepared < 1024 && budget.remaining > 0 && performance.now() < budget.deadline) {
      budget.remaining--;
      const i = this.prepared++,
        offset = 65536 + i * 4;
      s.routes[offset] = i < plan.routes.slots ? (s.destinations[i * 2] ?? 0) : 0;
      s.routes[offset + 1] = i < plan.routes.slots ? (s.destinations[i * 2 + 1] ?? 0) : 0;
      s.routes[offset + 2] = i < plan.routes.slots ? i % columns : -1;
      s.routes[offset + 3] = i < plan.routes.slots ? Math.floor(i / columns) : 0;
    }
    return this.prepared === 1024;
  }
  present(plan: SparsePlan, first: number, count: number, color: readonly number[]) {
    const r = this.renderer,
      gl = r.gl,
      shader = this.presenter;
    if (
      !shader ||
      this.prepared !== 1024 ||
      count < 1 ||
      count > 16 ||
      first + count > plan.routes.slots ||
      r.resources.mask.texture === r.resources.staging.texture
    )
      throw Error("sparse-present");
    if (!first) this.table(plan, 1, plan.routes.slots);
    gl.bindFramebuffer(gl.FRAMEBUFFER, r.resources.staging.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(true, true, true, !r.resources.packed);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(shader);
    gl.bindVertexArray(null);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindSampler(0, null);
    gl.bindTexture(gl.TEXTURE_2D, r.resources.mask.texture);
    gl.uniform1i(gl.getUniformLocation(shader, "image"), 0);
    gl.uniform1i(gl.getUniformLocation(shader, "packedMask"), r.resources.packed ? 1 : 0);
    gl.uniform3f(
      gl.getUniformLocation(shader, "groupColor"),
      color[0] ?? 0,
      color[1] ?? 0,
      color[2] ?? 0,
    );
    gl.uniform2f(gl.getUniformLocation(shader, "viewport"), r.width, r.height);
    gl.uniform1i(gl.getUniformLocation(shader, "routeTable"), 2);
    gl.uniform1i(gl.getUniformLocation(shader, "firstTile"), first);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
  }
  dispose() {
    const gl = this.renderer.gl;
    for (const texture of this.banks) gl.deleteTexture(texture);
    this.banks = [];
    if (this.ink) gl.deleteProgram(this.ink);
    if (this.presenter) gl.deleteProgram(this.presenter);
    this.ink = undefined;
    this.presenter = undefined;
  }
}
