import { createInkProgram } from "../../../../vector-editor/src/ink-program.ts";
import { CoverageRenderer } from "../../../../vector-editor/src/coverage-renderer.ts";
import { GpuArena } from "../../../../vector-editor/src/gpu-arena.ts";
import { PencilGrain } from "../../../../vector-editor/src/pencil-grain.ts";
export function renderer(canvas, records) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  if (!gl) throw Error("WebGL2 unavailable");
  const ink = createInkProgram(gl),
    coverage = new CoverageRenderer(gl),
    arena = new GpuArena(gl),
    pencil = new PencilGrain(gl);
  const uploaded = records.map((r) => {
    const count = r.entry.segments,
      a = arena.allocate(count, 16 * 1024 * 1024);
    if (!a) throw Error("Fixture allocation failed");
    arena.upload(a, r.entry.capsules, r.color, r.opacity, r.entry.capsuleStride, r.brush, 24, r.id);
    return { a, count };
  });
  pencil.bind(true);
  function draw(i) {
    const w = canvas.width,
      h = canvas.height,
      zoom = [0.3, 1, 2][Math.floor(i / 8) % 3],
      rotation = i * 0.02;
    coverage.begin(w, h);
    for (const { a, count } of uploaded) {
      coverage.startRun();
      gl.useProgram(ink.program);
      pencil.bind(true);
      gl.uniform2f(ink.viewport, w / 2, h / 2);
      gl.uniform2f(ink.deviceViewport, w, h);
      gl.uniform1i(ink.pencilGrain, 2);
      gl.uniform1i(ink.pencilParticles, 3);
      gl.uniform1i(ink.atlasRoutes, 1);
      gl.uniform1i(ink.routeCount, 0);
      gl.uniform1f(ink.rasterHeight, h);
      gl.uniform3f(ink.camera, 150 - i, 100, zoom);
      gl.uniform1f(ink.pixelWorld, 1 / (zoom * 2));
      gl.uniform2f(ink.rotation, Math.cos(rotation), Math.sin(rotation));
      gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer);
      for (let k = 0; k < 4; k++) {
        gl.enableVertexAttribArray(k);
        gl.vertexAttribDivisor(k, 1);
        gl.vertexAttribPointer(
          k,
          k < 2 ? 3 : 4,
          k < 2 ? gl.FLOAT : gl.UNSIGNED_BYTE,
          k >= 2,
          32,
          a.offset * 32 + (k < 2 ? k * 12 : 24 + (k - 2) * 4),
        );
      }
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
      coverage.finishRun();
    }
    coverage.end();
    const error = gl.getError();
    if (error) throw Error(`GPU error ${error}`);
  }
  async function complete() {
    const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const start = performance.now();
    try {
      while (true) {
        const state = gl.clientWaitSync(fence, 0, 0);
        if (state === gl.ALREADY_SIGNALED || state === gl.CONDITION_SATISFIED) return;
        if (state === gl.WAIT_FAILED || performance.now() - start > 5000)
          throw Error("Fence failed");
        await new Promise((r) => setTimeout(r, 1));
      }
    } finally {
      gl.deleteSync(fence);
    }
  }
  function pixels() {
    const data = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
    return data;
  }
  return {
    draw,
    complete,
    pixels,
    bytes: () => ({
      arena: arena.bytes,
      mask: coverage.stats.maskBytes,
      material: pencil.textureBytes,
    }),
  };
}
