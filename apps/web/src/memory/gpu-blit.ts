import type { allocateGpu } from "./gpu-allocation.ts";
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
