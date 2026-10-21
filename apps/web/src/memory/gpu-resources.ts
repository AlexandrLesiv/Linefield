export function program(
  gl: WebGL2RenderingContext,
  vertex: string,
  fragment: string,
): WebGLProgram {
  const p = gl.createProgram();
  if (!p) throw Error("gpu-program");
  const shaders: WebGLShader[] = [];
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertex],
      [gl.FRAGMENT_SHADER, fragment],
    ] as const) {
      const shader = gl.createShader(type);
      if (!shader) throw Error("gpu-shader");
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw Error(gl.getShaderInfoLog(shader) ?? "gpu-compile");
      gl.attachShader(p, shader);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(p) ?? "gpu-link");
    return p;
  } catch (error) {
    gl.deleteProgram(p);
    throw error;
  } finally {
    for (const s of shaders) gl.deleteShader(s);
  }
}
export function target(gl: WebGL2RenderingContext, width: number, height: number) {
  const texture = gl.createTexture(),
    framebuffer = gl.createFramebuffer();
  if (!texture || !framebuffer) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    throw Error("gpu-target");
  }
  try {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE ||
      gl.getError() !== gl.NO_ERROR
    )
      throw Error("gpu-target");
  } catch (error) {
    gl.deleteTexture(texture);
    gl.deleteFramebuffer(framebuffer);
    throw error;
  }
  return {
    texture,
    framebuffer,
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteFramebuffer(framebuffer);
    },
  };
}
