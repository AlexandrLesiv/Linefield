import { textureBytes } from "./types";
export class ImageGpu {
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private locations: {
    image: WebGLUniformLocation | null;
    opacity: WebGLUniformLocation | null;
    viewport: WebGLUniformLocation | null;
  };
  constructor(readonly gl: WebGL2RenderingContext) {
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram(),
      vao = gl.createVertexArray(),
      buffer = gl.createBuffer();
    if (!program || !vao || !buffer) {
      gl.deleteProgram(program);
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(buffer);
      throw Error("image-gpu-allocation");
    }
    try {
      for (const [type, source] of [
        [
          gl.VERTEX_SHADER,
          `#version 300 es
layout(location=0) in vec2 point;layout(location=1) in vec2 source;uniform vec2 viewport;out vec2 uv;
void main(){uv=source;gl_Position=vec4(point.x*2./viewport.x-1.,1.-point.y*2./viewport.y,0,1);}`,
        ],
        [
          gl.FRAGMENT_SHADER,
          `#version 300 es
precision highp float;uniform sampler2D image;uniform float opacity;in vec2 uv;out vec4 color;
void main(){vec2 dx=dFdx(uv),dy=dFdy(uv);vec2 pixel=max(vec2(length(vec2(dx.x,dy.x)),length(vec2(dx.y,dy.y))),vec2(1e-12));vec2 edge=min(uv,vec2(1)-uv)/pixel;float coverage=clamp(min(edge.x,edge.y)+.5,0.,1.);color=textureGrad(image,clamp(uv,vec2(0),vec2(1)),dx,dy)*opacity*coverage;}`,
        ],
      ] as const) {
        const shader = gl.createShader(type);
        if (!shader) throw Error("image-gpu-allocation");
        shaders.push(shader);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error("image-gpu-shader");
        gl.attachShader(program, shader);
      }
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw Error("image-gpu-shader");
      this.program = program;
      this.vao = vao;
      this.buffer = buffer;
      this.locations = {
        image: gl.getUniformLocation(program, "image"),
        opacity: gl.getUniformLocation(program, "opacity"),
        viewport: gl.getUniformLocation(program, "viewport"),
      };
    } catch (error) {
      gl.deleteProgram(program);
      gl.deleteVertexArray(vao);
      gl.deleteBuffer(buffer);
      throw error;
    } finally {
      for (const shader of shaders) gl.deleteShader(shader);
    }
  }
  healthy() {
    if (this.gl.isContextLost() || this.gl.getError() !== this.gl.NO_ERROR)
      throw Error("image-gpu-lost");
  }
  upload(image: ImageBitmap, mipmaps = true) {
    const gl = this.gl;
    this.healthy();
    if (Math.max(image.width, image.height) > gl.getParameter(gl.MAX_TEXTURE_SIZE))
      throw Error("image-texture-limit");
    const texture = gl.createTexture();
    if (!texture) throw Error("image-gpu-allocation");
    try {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      // ImageBitmap decoding owns premultiplication; never leak unpack flags into Ink uploads.
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      if (mipmaps) gl.generateMipmap(gl.TEXTURE_2D);
      this.healthy();
      return {
        texture,
        bytes: mipmaps ? textureBytes(image.width, image.height) : image.width * image.height * 4,
        width: image.width,
        height: image.height,
      };
    } catch (error) {
      gl.deleteTexture(texture);
      throw error;
    }
  }
  draw(
    texture: WebGLTexture,
    corners: readonly number[],
    opacity: number,
    width: number,
    height: number,
  ) {
    if (
      corners.length !== 8 ||
      ![...corners, opacity, width, height].every(Number.isFinite) ||
      opacity < 0 ||
      opacity > 1 ||
      width <= 0 ||
      height <= 0
    )
      throw Error("image-render-boundary");
    const gl = this.gl,
      p = this.program,
      vertices = new Float32Array(24);
    const ax = corners[2] - corners[0],
      ay = corners[3] - corners[1],
      bx = corners[4] - corners[0],
      by = corners[5] - corners[1];
    const padU = 1 / Math.max(1e-12, Math.hypot(ax, ay)),
      padV = 1 / Math.max(1e-12, Math.hypot(bx, by));
    for (const [i, corner] of [0, 1, 2, 2, 1, 3].entries()) {
      const u = corner & 1 ? 1 + padU : -padU,
        v = corner >> 1 ? 1 + padV : -padV;
      vertices.set([corners[0] + u * ax + v * bx, corners[1] + u * ay + v * by, u, v], i * 4);
    }
    gl.useProgram(p);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
    for (let i = 0; i < 2; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 2, gl.FLOAT, false, 16, i * 8);
      gl.vertexAttribDivisor(i, 0);
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(this.locations.image, 0);
    gl.uniform1f(this.locations.opacity, opacity);
    gl.uniform2f(this.locations.viewport, width, height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (gl.isContextLost()) throw Error("image-gpu-lost");
  }
  dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.buffer);
  }
}
