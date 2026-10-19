import type { CanvasKit, Path } from "canvaskit-wasm";

export function surface(kit: CanvasKit, width: number, height: number) {
  const output = new OffscreenCanvas(width, height);
  const handle = kit.GetWebGLContext(output, { depth: 0, antialias: 0, stencil: 1 });
  const context = kit.MakeWebGLContext(handle);
  if (!context) {
    kit.deleteContext(handle);
    throw Error("worker-webgl");
  }
  const front = kit.MakeOnScreenGLSurface(context, width, height, kit.ColorSpace.SRGB);
  const info = {
    width,
    height,
    colorType: kit.ColorType.RGBA_8888,
    alphaType: kit.AlphaType.Premul,
    colorSpace: kit.ColorSpace.SRGB,
  };
  const staging = kit.MakeRenderTarget(context, info);
  if (!front || !staging) {
    front?.delete();
    staging?.delete();
    context.delete();
    kit.deleteContext(handle);
    throw Error("worker-surface");
  }
  const paint = new kit.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(kit.PaintStyle.Fill);
  paint.setColor(kit.BLACK);
  const gl = output.getContext("webgl2") ?? output.getContext("webgl");
  const debug = gl?.getExtension("WEBGL_debug_renderer_info");
  return {
    environment: {
      userAgent: navigator.userAgent,
      renderer:
        gl && debug ? (gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) as unknown) : "unavailable",
      attributes: gl?.getContextAttributes(),
      width,
      height,
    },
    canvas: staging.getCanvas(),
    draw(path: Path) {
      staging.getCanvas().drawPath(path, paint);
    },
    flush() {
      staging.flush();
    },
    pixels() {
      const pixels = staging
        .getCanvas()
        .readPixels(0, 0, { ...info, alphaType: kit.AlphaType.Unpremul });
      if (!(pixels instanceof Uint8Array)) throw Error("readback");
      return pixels;
    },
    export() {
      staging.flush();
      const image = staging.makeImageSnapshot();
      if (!image) throw Error("snapshot");
      try {
        front.getCanvas().clear(kit.WHITE);
        front.getCanvas().drawImage(image, 0, 0);
        front.flush();
        output.transferToImageBitmap().close();
      } finally {
        image.delete();
      }
    },
    dispose() {
      paint.delete();
      staging.delete();
      front.delete();
      context.delete();
      kit.deleteContext(handle);
    },
  };
}
export type RenderSurface = ReturnType<typeof surface>;
