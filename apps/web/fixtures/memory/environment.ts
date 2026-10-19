export function environment(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
  if (!gl) throw Error("WebGL unavailable");
  const extension = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    dpr: devicePixelRatio,
    visibility: document.visibilityState,
    width: innerWidth,
    height: innerHeight,
    contextAttributes: gl.getContextAttributes(),
    renderer: extension
      ? (gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) as unknown)
      : "unavailable",
    version: gl.getParameter(gl.VERSION) as unknown,
    redBits: gl.getParameter(gl.RED_BITS) as unknown,
    greenBits: gl.getParameter(gl.GREEN_BITS) as unknown,
    blueBits: gl.getParameter(gl.BLUE_BITS) as unknown,
    alphaBits: gl.getParameter(gl.ALPHA_BITS) as unknown,
    depthBits: gl.getParameter(gl.DEPTH_BITS) as unknown,
    stencilBits: gl.getParameter(gl.STENCIL_BITS) as unknown,
    caveat:
      "Headless browser context metadata; driver allocation and physical display latency unavailable",
  };
}
