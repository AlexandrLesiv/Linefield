import type { GpuRenderer } from "./gpu-renderer.ts";
export const seedVertex = `#version 300 es
precision highp float;
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.0-1.0,0,1);}`;
export const seedFragment = `#version 300 es
precision highp float;uniform sampler2D image;uniform ivec2 shift;out vec4 outColor;
void main(){outColor=vec4(texelFetch(image,ivec2(gl_FragCoord.xy)-shift,0).rgb,1);}`;
export function copyPrefix(renderer: GpuRenderer) {
  const { gl, resources: r, width, height } = renderer;
  if (r.base.texture === r.staging.texture) throw Error("gpu-feedback");
  gl.bindFramebuffer(gl.FRAMEBUFFER, r.staging.framebuffer);
  gl.viewport(0, 0, width, height);
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  gl.colorMask(true, true, true, !r.packed);
  gl.useProgram(r.seed);
  gl.bindVertexArray(null);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, r.base.texture);
  gl.uniform1i(gl.getUniformLocation(r.seed, "image"), 0);
  gl.uniform2i(gl.getUniformLocation(r.seed, "shift"), 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
