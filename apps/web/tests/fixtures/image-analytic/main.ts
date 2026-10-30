import { ImageGpu } from "../../../../vector-editor/src/images/gpu";
async function render(blob: Blob, transform: number[], opacity: number, background: string) {
  const width = 512,
    height = 512,
    canvas = new OffscreenCanvas(width, height),
    gl = canvas.getContext("webgl2", { antialias: false, premultipliedAlpha: true })!;
  const gpu = new ImageGpu(gl),
    bitmap = await createImageBitmap(blob, {
      premultiplyAlpha: "premultiply",
      imageOrientation: "from-image",
      colorSpaceConversion: "default",
    }),
    image = gpu.upload(bitmap);
  const output = gl.createTexture()!,
    fb = gl.createFramebuffer()!;
  gl.bindTexture(gl.TEXTURE_2D, output);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, output, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
    throw Error("fixture-fbo");
  gl.viewport(0, 0, width, height);
  const white = background === "white" ? 1 : 0;
  gl.clearColor(white, white, white, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const [a, b, c, d, e, f] = transform,
    corners: number[] = [];
  for (const [x, y] of [
    [0, 0],
    [bitmap.width, 0],
    [0, bitmap.height],
    [bitmap.width, bitmap.height],
  ])
    corners.push(a * x + c * y + e, b * x + d * y + f);
  gpu.draw(image.texture, corners, opacity, width, height);
  const raw = new Uint8Array(width * height * 4),
    pixels = new Uint8ClampedArray(raw.length);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, raw);
  gpu.healthy();
  for (let y = 0; y < height; y++)
    pixels.set(raw.subarray((height - y - 1) * width * 4, (height - y) * width * 4), y * width * 4);
  const reference = new OffscreenCanvas(width, height),
    ctx = reference.getContext("2d")!;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);
  ctx.setTransform(a, b, c, d, e, f);
  ctx.globalAlpha = opacity;
  ctx.drawImage(bitmap, 0, 0);
  const expected = ctx.getImageData(0, 0, width, height).data;
  bitmap.close();
  gl.deleteTexture(image.texture);
  gl.deleteTexture(output);
  gl.deleteFramebuffer(fb);
  gpu.dispose();
  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return { pixels, expected, width, height };
}
declare global {
  interface Window {
    analyticRender: typeof render;
  }
}
window.analyticRender = render;
