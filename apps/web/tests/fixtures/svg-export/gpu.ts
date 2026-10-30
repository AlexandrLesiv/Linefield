import { background } from "./background";
import type { PaperSettings } from "../../../../vector-editor/src/paper-background";
import { createInkProgram } from "../../../../vector-editor/src/ink-program";
import { CoverageRenderer } from "../../../../vector-editor/src/coverage-renderer";
import { PencilGrain } from "../../../../vector-editor/src/pencil-grain";
export type Group = { id: number; brush: number; bytes: ArrayBuffer; coordinates?: Float64Array };
export type View = {
  x: number;
  y: number;
  width: number;
  height: number;
  density: number;
  regionX?: string;
  regionY?: string;
};
/** Isolated backend: unchanged product shader, material and coverage union. */
export function backend() {
  const canvas = new OffscreenCanvas(1, 1);
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    antialias: false,
  });
  if (!gl) throw Error("svg-raster-capability");
  const assertHealthy = () => {
    if (gl.isContextLost()) throw Error("svg-context-lost");
    if (gl.getError() !== gl.NO_ERROR) throw Error("svg-gpu-error");
  };
  try {
    const ink = createInkProgram(gl),
      coverage = new CoverageRenderer(gl),
      grain = new PencilGrain(gl),
      drawBackground = background(gl);
    const buffer = gl.createBuffer(),
      vao = gl.createVertexArray();
    if (!buffer || !vao) throw Error("svg-gpu-allocation");
    return {
      canvas,
      assertHealthy,
      render(groups: Group[], view: View, paper?: PaperSettings) {
        assertHealthy();
        const w = Math.ceil(view.width * view.density),
          h = Math.ceil(view.height * view.density);
        if (w * h * 12 + 24 * 1024 * 1024 > 128 * 1024 * 1024) throw Error("svg-scratch-limit");
        canvas.width = w;
        canvas.height = h;
        coverage.begin(w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (paper) drawBackground(paper, view, w, h);
        const anchorX = Math.floor(view.x / 64) * 64,
          anchorY = Math.floor(view.y / 64) * 64;
        for (const group of groups) {
          if (group.bytes.byteLength % 32) throw Error("svg-invalid-chunk");
          coverage.startRun();
          gl.useProgram(ink.program);
          gl.bindVertexArray(vao);
          gl.uniform2f(ink.viewport, w, h);
          gl.uniform2f(ink.deviceViewport, w, h);
          gl.uniform3f(
            ink.camera,
            -(view.x - anchorX) * view.density,
            -(view.y - anchorY) * view.density,
            view.density,
          );
          gl.uniform2f(ink.rotation, 1, 0);
          gl.uniform1f(ink.pixelWorld, 1 / view.density);
          gl.uniform1f(ink.rasterHeight, h);
          gl.uniform1i(ink.routeCount, 0);
          gl.uniform1i(ink.atlasRoutes, 1);
          gl.uniform1i(ink.pencilGrain, 2);
          gl.uniform1i(ink.pencilParticles, 3);
          grain.bind(group.brush !== 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          const projected = group.bytes.slice(0),
            values = new Float32Array(projected),
            original = new Float32Array(group.bytes);
          for (let i = 0; i < group.bytes.byteLength / 32; i++)
            for (let k = 0; k < 6; k++)
              values[i * 8 + k] =
                (group.coordinates?.[i * 6 + k] ?? original[i * 8 + k]) -
                (k === 0 || k === 3 ? anchorX : k === 1 || k === 4 ? anchorY : 0);
          gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(projected), gl.STREAM_DRAW);
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
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, group.bytes.byteLength / 32);
          coverage.finishRun();
        }
        coverage.end();
        assertHealthy();
      },
      dispose() {
        coverage.dispose();
        gl.deleteProgram(ink.program);
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      },
    };
  } catch (error) {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    throw error;
  }
}
