import { targets } from "./gpu-targets.ts";
import { vertex, fragment, screenVertex, screenFragment } from "./gpu-shaders.ts";
import { program } from "./gpu-resources.ts";
export function allocateGpu(gl: WebGL2RenderingContext, width: number, height: number) {
  const cleanup: (() => void)[] = [];
  const dispose = () => {
    for (const release of cleanup.reverse()) release();
    cleanup.length = 0;
  };
  try {
    const ink = program(gl, vertex, fragment);
    cleanup.push(() => gl.deleteProgram(ink));
    const copy = program(gl, screenVertex, screenFragment);
    cleanup.push(() => gl.deleteProgram(copy));
    const vao = gl.createVertexArray();
    if (!vao) throw Error("gpu-buffer");
    cleanup.push(() => gl.deleteVertexArray(vao));
    const buffers: WebGLBuffer[] = [];
    for (let i = 0; i < 2; i++) {
      const buffer = gl.createBuffer();
      if (!buffer) throw Error("gpu-buffer");
      buffers.push(buffer);
      cleanup.push(() => gl.deleteBuffer(buffer));
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, 4096 * 32, gl.DYNAMIC_DRAW);
    }
    const surfaces = targets(gl, width, height);
    cleanup.push(surfaces.dispose);
    if (gl.isContextLost() || gl.getError() !== gl.NO_ERROR) throw Error("gpu-resource");
    return { ink, copy, vao, buffers, ...surfaces, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}
