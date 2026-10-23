import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
export function samplingPixels(renderer: GpuRenderer, framebuffer: WebGLFramebuffer) {
  const { gl, width, height } = renderer;
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, framebuffer);
  const data = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
  if (gl.getError() !== gl.NO_ERROR) throw Error("sampling readback");
  return data;
}
export function samplingDifference(actual: Uint8Array, reference: Uint8Array) {
  let changed = 0,
    maximum = 0,
    total = 0,
    ink = 0;
  for (let i = 0; i < reference.length; i++) {
    if (i % 4 === 3) continue;
    const delta = Math.abs((actual[i] ?? 0) - (reference[i] ?? 0));
    changed += Number(delta > 0);
    total += delta;
    maximum = Math.max(maximum, delta);
    ink += Number((actual[i] ?? 255) < 240);
  }
  return { changed, maximum, total, ink };
}
export function samplersRestored(gl: WebGL2RenderingContext) {
  for (const unit of [gl.TEXTURE0, gl.TEXTURE1]) {
    gl.activeTexture(unit);
    if (gl.getParameter(gl.SAMPLER_BINDING) !== null) throw Error("sampler leaked");
  }
}
export async function samplingImage(renderer: GpuRenderer, pixels: Uint8Array) {
  const { width, height } = renderer;
  const canvas = new OffscreenCanvas(width, height),
    context = canvas.getContext("2d");
  if (!context) throw Error("capture context");
  const image = context.createImageData(width, height);
  for (let y = 0; y < height; y++) {
    const start = (height - y - 1) * width * 4;
    image.data.set(pixels.subarray(start, start + width * 4), y * width * 4);
  }
  for (let offset = 3; offset < image.data.length; offset += 4) image.data[offset] = 255;
  context.putImageData(image, 0, 0);
  const bytes = new Uint8Array(
    await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer(),
  );
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 4096)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 4096));
  return btoa(binary);
}
