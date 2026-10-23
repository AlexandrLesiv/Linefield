export function opaqueSampler(gl: WebGL2RenderingContext) {
  const sampler = gl.createSampler();
  if (!sampler) throw Error("gpu-resource");
  try {
    gl.samplerParameteri(sampler, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.samplerParameteri(sampler, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(sampler, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (gl.getError() !== gl.NO_ERROR) throw Error("gpu-resource");
    return sampler;
  } catch (error) {
    gl.deleteSampler(sampler);
    throw error;
  }
}
// Presentation selection only. This grants no geometry, reuse, or receipt authority.
export function resampleOpaque(matrix: Float32Array | undefined) {
  return (
    !!matrix &&
    !(
      matrix[0] === 1 &&
      matrix[1] === 0 &&
      matrix[2] === 0 &&
      matrix[3] === 1 &&
      Number.isInteger(matrix[4]) &&
      Number.isInteger(matrix[5])
    )
  );
}
