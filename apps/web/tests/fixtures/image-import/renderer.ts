import type { ImageItem, View } from "./types";
export class Renderer {
  readonly canvas = new OffscreenCanvas(1, 1);
  readonly gl = this.canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })!;
  private textures = new Map<number, WebGLTexture>();
  private program: WebGLProgram;
  constructor() {
    const gl = this.gl;
    if (!gl) throw Error("image-webgl-unavailable");
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw Error("image-shader");
      return shader;
    };
    const vertex = compile(
      gl.VERTEX_SHADER,
      `#version 300 es
      uniform mat3 transform; uniform vec2 size; uniform vec2 viewport; out vec2 uv;
      void main(){vec2 p[6]=vec2[6](vec2(0,0),vec2(1,0),vec2(0,1),vec2(0,1),vec2(1,0),vec2(1,1));uv=p[gl_VertexID];vec3 q=transform*vec3(uv*size,1);gl_Position=vec4(q.x*2./viewport.x-1.,1.-q.y*2./viewport.y,0,1);}`,
    );
    const fragment = compile(
      gl.FRAGMENT_SHADER,
      `#version 300 es
      precision highp float;uniform sampler2D image;uniform float opacity;in vec2 uv;out vec4 color;void main(){color=texture(image,uv)*opacity;}`,
    );
    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vertex);
    gl.attachShader(this.program, fragment);
    gl.linkProgram(this.program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw Error("image-program");
  }
  upload(id: number, image: ImageBitmap, mipmap = false) {
    const gl = this.gl;
    this.healthy();
    if (Math.max(image.width, image.height) > gl.getParameter(gl.MAX_TEXTURE_SIZE))
      throw Error("image-texture-limit");
    const start = performance.now(),
      texture = gl.createTexture();
    if (!texture) throw Error("image-texture-allocation");
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    const uploadSubmissionMs = performance.now() - start,
      mipStart = performance.now();
    if (mipmap) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    const mipmapSubmissionMs = mipmap ? performance.now() - mipStart : 0;
    if (gl.getError() !== gl.NO_ERROR || gl.isContextLost()) {
      gl.deleteTexture(texture);
      throw Error("image-upload-failed");
    }
    this.textures.set(id, texture);
    return { uploadSubmissionMs, mipmapSubmissionMs };
  }
  healthy() {
    if (this.gl.isContextLost() || this.gl.getError() !== this.gl.NO_ERROR)
      throw Error("image-context-failed");
  }
  validate(view: View) {
    if (
      !Number.isInteger(view.width) ||
      !Number.isInteger(view.height) ||
      view.width < 1 ||
      view.height < 1 ||
      view.width * view.height > 4194304
    )
      throw Error("image-view-limit");
  }
  begin(view: View) {
    this.healthy();
    this.validate(view);
    this.canvas.width = view.width;
    this.canvas.height = view.height;
    const gl = this.gl;
    gl.viewport(0, 0, view.width, view.height);
    const white = view.background === "white" ? 1 : 0;
    gl.clearColor(white, white, white, view.background === "transparent" ? 0 : 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  draw(item: ImageItem, image: ImageBitmap) {
    const gl = this.gl,
      p = this.program,
      [a, b, c, d, e, f] = item.transform;
    if (
      ![...item.transform, item.opacity].every(Number.isFinite) ||
      item.opacity < 0 ||
      item.opacity > 1
    )
      throw Error("image-transform");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(p);
    gl.bindVertexArray(null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.get(item.id)!);
    gl.uniform1i(gl.getUniformLocation(p, "image"), 0);
    gl.uniform1f(gl.getUniformLocation(p, "opacity"), item.opacity);
    gl.uniform2f(gl.getUniformLocation(p, "size"), image.width, image.height);
    gl.uniform2f(gl.getUniformLocation(p, "viewport"), this.canvas.width, this.canvas.height);
    gl.uniformMatrix3fv(gl.getUniformLocation(p, "transform"), false, [a, b, 0, c, d, 0, e, f, 1]);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  read() {
    const { width, height } = this.canvas,
      raw = new Uint8Array(width * height * 4),
      pixels = new Uint8ClampedArray(raw.length);
    this.gl.readPixels(0, 0, width, height, this.gl.RGBA, this.gl.UNSIGNED_BYTE, raw);
    for (let y = 0; y < height; y++)
      pixels.set(
        raw.subarray((height - y - 1) * width * 4, (height - y) * width * 4),
        y * width * 4,
      );
    this.healthy();
    return pixels;
  }
  reset() {
    for (const texture of this.textures.values()) this.gl.deleteTexture(texture);
    this.textures.clear();
  }
  dispose() {
    this.reset();
    this.gl.deleteProgram(this.program);
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
