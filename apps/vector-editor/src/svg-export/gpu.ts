import { createInkProgram } from "../ink-program";
import { CoverageRenderer } from "../coverage-renderer";
import { PencilGrain } from "../pencil-grain";
import { createBackground } from "./background";
import { packPacket } from "./packet";
import { SCRATCH_LIMIT, type ExportView } from "./types";

/** One isolated coverage mask, one output surface, no retained document geometry. */
export async function createGpu(view: ExportView, wasmUrl: string, permit: () => Promise<void>) {
  const w = view.pixelWidth,
    h = view.pixelHeight;
  if (
    ![view.x, view.y, view.width, view.height, view.density, w, h].every(Number.isFinite) ||
    !Number.isSafeInteger(w) ||
    !Number.isSafeInteger(h) ||
    w < 1 ||
    h < 1 ||
    w * h * 24 + 24 * 1024 * 1024 > SCRATCH_LIMIT
  )
    throw Error("svg-raster-memory-limit");
  await permit();
  const canvas = new OffscreenCanvas(w, h);
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    antialias: false,
  });
  if (!gl) throw Error("svg-raster-capability");
  const healthy = () => {
    if (gl.isContextLost()) throw Error("svg-context-lost");
    if (gl.getError() !== gl.NO_ERROR) throw Error("svg-gpu-error");
  };
  try {
    const max = Math.min(
      gl.getParameter(gl.MAX_TEXTURE_SIZE),
      gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    );
    if (w > max || h > max) throw Error("svg-raster-dimension-limit");
    const background = await createBackground(gl, wasmUrl, permit);
    await permit();
    const ink = createInkProgram(gl),
      coverage = new CoverageRenderer(gl),
      grain = new PencilGrain(gl);
    const buffer = gl.createBuffer(),
      vao = gl.createVertexArray();
    if (!buffer || !vao) throw Error("svg-gpu-allocation");
    const anchorX = Math.floor(view.x / 64) * 64,
      anchorY = Math.floor(view.y / 64) * 64;
    let run = false;
    const clear = () => {
      coverage.begin(w, h);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };
    clear();
    return {
      healthy,
      async background() {
        await permit();
        healthy();
        clear();
        background(view);
        healthy();
      },
      async packet(values: Float64Array, last: boolean) {
        const packed = packPacket(values, anchorX, anchorY);
        await permit();
        healthy();
        if (!run) {
          clear();
          coverage.startRun();
          run = true;
        }
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
        grain.bind(packed.brush !== 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, packed.data, gl.STREAM_DRAW);
        for (let first = 0; first < packed.count; first += 64) {
          // Yield so a new input-priority message can stop the next submission.
          await new Promise((resolve) => setTimeout(resolve, 0));
          await permit();
          healthy();
          for (let k = 0; k < 4; k++) {
            gl.enableVertexAttribArray(k);
            gl.vertexAttribPointer(
              k,
              k < 2 ? 3 : 4,
              k < 2 ? gl.FLOAT : gl.UNSIGNED_BYTE,
              k >= 2,
              32,
              first * 32 + (k < 2 ? k * 12 : 24 + (k - 2) * 4),
            );
            gl.vertexAttribDivisor(k, 1);
          }
          gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, Math.min(64, packed.count - first));
          gl.flush();
        }
        if (last) {
          coverage.end();
          run = false;
        }
        healthy();
      },
      async png() {
        if (run) throw Error("svg-group-incomplete");
        await permit();
        healthy();
        const blob = await canvas.convertToBlob({ type: "image/png" });
        healthy();
        await permit();
        const decoded = await createImageBitmap(blob);
        try {
          if (decoded.width !== w || decoded.height !== h) throw Error("svg-png-dimensions");
        } finally {
          decoded.close();
        }
        healthy();
        return blob;
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
