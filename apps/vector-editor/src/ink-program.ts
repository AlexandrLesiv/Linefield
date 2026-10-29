import { inkFragment, inkVertex } from "./ink-shaders";

/** Browser-owned GPU resources. No document, geometry or editing authority. */
export function createInkProgram(gl: WebGL2RenderingContext) {
  const program = gl.createProgram();
  if (!program) throw Error("Unable to allocate the ink rendering program.");
  const attached: WebGLShader[] = [];
  let ready = false;
  try {
    const sources: readonly (readonly [number, string])[] = [
      [gl.VERTEX_SHADER, inkVertex],
      [gl.FRAGMENT_SHADER, inkFragment],
    ];
    for (const [type, source] of sources) {
      const shader = gl.createShader(type);
      if (!shader) throw Error("Unable to allocate an ink shader.");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const detail = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw Error(detail || "Unable to compile an ink shader.");
      }
      gl.attachShader(program, shader);
      attached.push(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw Error(gl.getProgramInfoLog(program) || "Unable to link the ink rendering program.");
    const location = (name: string) => gl.getUniformLocation(program, name);
    const result = Object.freeze({
      program,
      pencilGrain: location("pencilGrain"),
      // An optimized-out uniform remains null, as in the approved renderer.
      pencilParticles: location("pencilParticles"),
      camera: location("camera"),
      viewport: location("viewport"),
      rotation: location("rotation"),
      pixelWorld: location("pixelWorld"),
      deviceViewport: location("deviceViewport"),
      rasterHeight: location("rasterHeight"),
      routeCount: location("routeCount"),
      routeBase: location("routeBase"),
      routeSpan: location("routeSpan"),
      atlasRoutes: location("atlasRoutes"),
    });
    ready = true;
    return result;
  } finally {
    // Linked programs retain their executable after shader objects are detached.
    // Failed creation also releases every successfully attached intermediate.
    for (const shader of attached) {
      gl.detachShader(program, shader);
      gl.deleteShader(shader);
    }
    if (!ready) gl.deleteProgram(program);
  }
}
