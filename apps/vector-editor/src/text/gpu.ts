import { ImageGpu } from "../images/gpu";
export class TextGpu {
  private images: ImageGpu;
  private program: WebGLProgram;
  private vao: WebGLVertexArrayObject;
  private buffer: WebGLBuffer;
  private view: WebGLUniformLocation | null;
  private opacity: WebGLUniformLocation | null;
  constructor(private gl: WebGL2RenderingContext) {
    this.images = new ImageGpu(gl);
    const p = gl.createProgram(),
      vao = gl.createVertexArray(),
      buffer = gl.createBuffer();
    if (!p || !vao || !buffer) {
      if (p) gl.deleteProgram(p);
      if (vao) gl.deleteVertexArray(vao);
      if (buffer) gl.deleteBuffer(buffer);
      this.images.dispose();
      throw Error("text-gpu-allocation");
    }
    this.program = p;
    this.vao = vao;
    this.buffer = buffer;
    const sources = [
      [
        gl.VERTEX_SHADER,
        `#version 300 es
layout(location=0)in vec2 point;layout(location=1)in vec2 source;uniform vec2 view;out vec2 uv;void main(){uv=source;gl_Position=vec4(point.x*2./view.x-1.,1.-point.y*2./view.y,0,1);}`,
      ],
      [
        gl.FRAGMENT_SHADER,
        `#version 300 es
precision highp float;uniform sampler2D image;uniform float opacity;in vec2 uv;out vec4 color;void main(){color=texture(image,uv)*opacity;}`,
      ],
    ] as const;
    try {
      for (const [type, source] of sources) {
        const shader = gl.createShader(type);
        if (!shader) throw Error("text-gpu-allocation");
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        gl.attachShader(p, shader);
        gl.deleteShader(shader);
      }
      gl.linkProgram(p);
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw Error("text-gpu-program");
      this.view = gl.getUniformLocation(p, "view");
      this.opacity = gl.getUniformLocation(p, "opacity");
    } catch (error) {
      this.dispose();
      throw error;
    }
  }
  upload(bitmap: ImageBitmap) {
    return this.images.upload(bitmap, false);
  }
  draw(
    texture: WebGLTexture,
    corners: number[],
    uv: number[],
    opacity: number,
    width: number,
    height: number,
  ) {
    const gl = this.gl,
      vertices = new Float32Array(24);
    for (const [index, corner] of [0, 1, 2, 2, 1, 3].entries())
      vertices.set(
        [
          corners[corner * 2],
          corners[corner * 2 + 1],
          corner & 1 ? uv[2] : uv[0],
          corner >> 1 ? uv[3] : uv[1],
        ],
        index * 4,
      );
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STREAM_DRAW);
    for (let i = 0; i < 2; i++) {
      gl.enableVertexAttribArray(i);
      gl.vertexAttribPointer(i, 2, gl.FLOAT, false, 16, i * 8);
      gl.vertexAttribDivisor(i, 0);
    }
    gl.uniform2f(this.view, width, height);
    gl.uniform1f(this.opacity, opacity);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.STENCIL_TEST);
    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    if (gl.isContextLost()) throw Error("text-gpu-lost");
  }
  dispose() {
    this.images.dispose();
    this.gl.deleteProgram(this.program);
    this.gl.deleteVertexArray(this.vao);
    this.gl.deleteBuffer(this.buffer);
  }
}
