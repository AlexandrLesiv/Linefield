import { createInkProgram } from "../../../../vector-editor/src/ink-program";
import { CoverageRenderer } from "../../../../vector-editor/src/coverage-renderer";
import { PencilGrain } from "../../../../vector-editor/src/pencil-grain";
import type { InkItem } from "./types";
export class Ink {
  private program;
  private coverage;
  private grain;
  private buffer;
  private vao;
  constructor(private gl: WebGL2RenderingContext) {
    this.program = createInkProgram(gl);
    this.coverage = new CoverageRenderer(gl);
    this.grain = new PencilGrain(gl);
    this.buffer = gl.createBuffer();
    this.vao = gl.createVertexArray();
  }
  begin(w: number, h: number) {
    this.coverage.begin(w, h);
  }
  draw(item: InkItem, w: number, h: number) {
    const gl = this.gl,
      p = this.program,
      bytes = new ArrayBuffer(32),
      floats = new Float32Array(bytes),
      colors = new Uint8Array(bytes);
    floats.set([...item.from, item.radius, ...item.to, item.radius]);
    colors.set([...item.color.map((v) => Math.round(v * 255)), Math.round(item.opacity * 255)], 24);
    this.coverage.startRun();
    gl.useProgram(p.program);
    gl.bindVertexArray(this.vao);
    gl.uniform2f(p.viewport, w, h);
    gl.uniform2f(p.deviceViewport, w, h);
    gl.uniform3f(p.camera, 0, 0, 1);
    gl.uniform2f(p.rotation, 1, 0);
    gl.uniform1f(p.pixelWorld, 1);
    gl.uniform1f(p.rasterHeight, h);
    gl.uniform1i(p.routeCount, 0);
    gl.uniform1i(p.atlasRoutes, 1);
    gl.uniform1i(p.pencilGrain, 2);
    gl.uniform1i(p.pencilParticles, 3);
    this.grain.bind(false);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, bytes, gl.STREAM_DRAW);
    for (let k = 0; k < 4; k++) {
      gl.enableVertexAttribArray(k);
      gl.vertexAttribPointer(
        k,
        k < 2 ? 3 : 4,
        k < 2 ? gl.FLOAT : gl.UNSIGNED_BYTE,
        k >= 2,
        32,
        k < 2 ? k * 12 : 24 + (k - 2) * 4,
      );
      gl.vertexAttribDivisor(k, 1);
    }
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, 1);
    this.coverage.finishRun();
  }
  dispose() {
    this.coverage.dispose();
    this.gl.deleteProgram(this.program.program);
    this.gl.deleteBuffer(this.buffer);
    this.gl.deleteVertexArray(this.vao);
  }
}
