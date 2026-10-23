import { SparseTables } from "./sparse-tables.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { SparsePlan } from "./sparse-plan.ts";
// Isolated reusable executor; production arena loans remain unintegrated.
export class SparseGpu {
  readonly routeBytes = 262144;
  compositeIssued = false;
  private tables: SparseTables;
  private renderer: GpuRenderer;
  private current: SparsePlan | undefined;
  private geometryDone = 0;
  private presented = 0;
  private serial = 0;
  private finished = true;
  private disposed = false;
  constructor(renderer: GpuRenderer) {
    this.renderer = renderer;
    this.tables = new SparseTables(renderer.gl);
  }
  async reset(plan: SparsePlan, precedingSerial = 0) {
    if (this.disposed || !this.finished) throw Error("sparse-unfinished");
    await this.renderer.validated(Math.max(this.serial, precedingSerial));
    this.current = plan;
    this.tables.prepared = 0;
    this.geometryDone = 0;
    this.presented = 0;
    this.compositeIssued = false;
    this.finished = false;
  }
  submitted(serial: number) {
    this.serial = Math.max(this.serial, serial);
  }
  async complete() {
    if (
      !this.current ||
      this.geometryDone !== this.current.routes.descriptors ||
      this.presented !== this.current.routes.slots
    )
      throw Error("sparse-incomplete");
    await this.renderer.validated(this.serial);
    this.finished = true;
  }
  preparePresenter(plan: SparsePlan, budget: { deadline: number; remaining: number }) {
    if (this.current !== plan || this.geometryDone) throw Error("sparse-prepare-order");
    return this.tables.prepare(plan, this.renderer.width, budget);
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
      shader = this.tables.ink;
    if (this.current !== plan || this.compositeIssued || descriptor !== this.geometryDone)
      throw Error("sparse-geometry-order");
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
      this.tables.upload(plan, 0, plan.routes.entries);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
    }
    this.tables.bind(0);
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
      this.geometryDone++;
    } finally {
      gl.vertexAttribDivisor(0, 1);
      gl.vertexAttribDivisor(1, 1);
    }
  }
  present(plan: SparsePlan, first: number, count: number, color: readonly number[]) {
    const r = this.renderer,
      gl = r.gl,
      shader = this.tables.presenter;
    if (
      !shader ||
      this.current !== plan ||
      this.tables.prepared !== 1024 ||
      this.geometryDone !== plan.routes.descriptors ||
      first !== this.presented ||
      count < 1 ||
      count > 16 ||
      first + count > plan.routes.slots ||
      r.resources.mask.texture === r.resources.staging.texture
    )
      throw Error("sparse-present");
    if (!first) this.tables.upload(plan, 1, plan.routes.slots);
    this.tables.bind(1);
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
    this.compositeIssued = true;
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
    this.presented += count;
  }
  dispose() {
    this.disposed = true;
    this.tables.dispose();
  }
}
