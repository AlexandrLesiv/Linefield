import { sparseViewport } from "./sparse-projection.ts";
import { SparseInterval } from "./sparse-interval.ts";
/** Fixed per-renderer capability; no mutable camera facts or per-frame allocations. */
export function rasterCapability(gl: WebGL2RenderingContext, width: number, height: number) {
  const precision = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)?.precision ?? 0;
  const subpixels: unknown = gl.getParameter(gl.SUBPIXEL_BITS);
  return (
    typeof subpixels === "number" &&
    sparseViewport(
      new SparseInterval(new Float64Array(0), new DataView(new ArrayBuffer(8))),
      width,
      height,
      precision,
      subpixels,
    )
  );
}
