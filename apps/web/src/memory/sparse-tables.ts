import { program } from "./gpu-resources.ts";
import {
  sparseVertex,
  sparseFragment,
  sparsePresentVertex,
  sparsePresentFragment,
} from "./sparse-shaders.ts";
import type { SparsePlan } from "./sparse-plan.ts";
export class SparseTables {
  ink: WebGLProgram | undefined;
  presenter: WebGLProgram | undefined;
  prepared = 0;
  private banks: WebGLTexture[] = [];
  private gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
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
  bind(bank: number) {
    const gl = this.gl,
      texture = this.banks[bank];
    if (!texture) throw Error("sparse-bank");
    gl.activeTexture(gl.TEXTURE2);
    gl.bindSampler(2, null);
    gl.bindTexture(gl.TEXTURE_2D, texture);
  }
  upload(plan: SparsePlan, bank: number, entries: number) {
    const gl = this.gl;
    this.bind(bank);
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
  prepare(plan: SparsePlan, width: number, budget: { deadline: number; remaining: number }) {
    const s = plan.storage,
      columns = Math.floor(width / 64);
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
  dispose() {
    for (const texture of this.banks) this.gl.deleteTexture(texture);
    this.banks = [];
    if (this.ink) this.gl.deleteProgram(this.ink);
    if (this.presenter) this.gl.deleteProgram(this.presenter);
    this.ink = undefined;
    this.presenter = undefined;
  }
}
