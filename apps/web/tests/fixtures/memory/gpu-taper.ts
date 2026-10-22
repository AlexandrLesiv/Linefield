import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { retireRenderer } from "./retire-renderer.ts";
type Disc = readonly [number, number, number];
function coverage(p: readonly number[], a: Disc, b: Disc) {
  const sample = (t: number) => {
    const radius = a[2] + (b[2] - a[2]) * t;
    const distance =
      Math.hypot((p[0] ?? 0) - a[0] - (b[0] - a[0]) * t, (p[1] ?? 0) - a[1] - (b[1] - a[1]) * t) -
      radius;
    return Math.min(0.5 - distance, 2 * radius);
  };
  // Independent f64 one-dimensional maximization of the AA disc union.
  // min(concave distance response, linear radius cap) is unimodal before clipping.
  let left = 0,
    right = 1;
  for (let i = 0; i < 80; i++) {
    const u = left + (right - left) / 3,
      v = right - (right - left) / 3;
    if (sample(u) < sample(v)) left = u;
    else right = v;
  }
  return Math.min(1, Math.max(0, sample(0), sample(1), sample((left + right) / 2)));
}
export async function gpuTaper(canvas: HTMLCanvasElement) {
  let cases = 0,
    maximumError = 0;
  let worst: unknown;
  const configurations = [
    [4096, 0.025, 0.5],
    [256, 2, 2],
    [256, 2, 8],
    [0.30001143617488674, 0.3250114321708679, 0.025],
    [4096, 819.2, 16384],
    [64, 0.025, 64.02499],
    [64, 64.02499, 0.025],
    [0.5, 0.025, 0.5],
    [256, 0.1, 128],
    [0.30001143617488674, 0.025, 0.3250114321708679],
  ];
  for (const [index, row] of configurations.entries())
    for (const angle of [0, Math.PI / 4, 0.731, Math.PI / 2 - 1e-7]) {
      const [length, r0, r1] = row;
      if (length === undefined || r0 === undefined || r1 === undefined) throw Error("case");
      const slope = (r1 - r0) / length;
      const radius = (r0 + r1) / 2;
      const boundary =
        Math.abs(slope) < 1
          ? [length / 2 - radius * slope, radius * Math.sqrt(1 - slope * slope)]
          : [r1 >= r0 ? length + r1 : r0, 0];
      // Last row deliberately samples the almost-contained small endpoint at a pixel center.
      if (length < 0.31) {
        boundary[0] = 0;
        boundary[1] = 0;
      }
      const c = Math.cos(angle),
        s = Math.sin(angle);
      const bx = boundary[0] ?? 0,
        by = boundary[1] ?? 0;
      const matrix = new Float32Array([
        c,
        s,
        -s,
        c,
        256.5 - (c * bx - s * by),
        256.5 - (s * bx + c * by),
      ]);
      const data = new Float32Array([0, 0, r0, length, 0, r1]);
      const disc = (offset: number): Disc => {
        const x = data[offset] ?? 0,
          y = data[offset + 1] ?? 0;
        return [
          (matrix[0] ?? 0) * x + (matrix[2] ?? 0) * y + (matrix[4] ?? 0),
          (matrix[1] ?? 0) * x + (matrix[3] ?? 0) * y + (matrix[5] ?? 0),
          (data[offset + 2] ?? 0) * Math.hypot(matrix[0] ?? 0, matrix[1] ?? 0),
        ];
      };
      const a = disc(0),
        b = disc(3);
      const renderer = new GpuRenderer(canvas, 512, 512);
      renderer.begin();
      renderer.group();
      renderer.draw(data, matrix, [0, 0, 0, 1]);
      renderer.composite();
      renderer.publish();
      renderer.gl.bindFramebuffer(renderer.gl.READ_FRAMEBUFFER, null);
      const pixels = new Uint8Array(9 * 9 * 4);
      renderer.gl.readPixels(252, 251, 9, 9, renderer.gl.RGBA, renderer.gl.UNSIGNED_BYTE, pixels);
      for (let y = 0; y < 9; y++)
        for (let x = 0; x < 9; x++) {
          const expected = coverage([252.5 + x, 260.5 - y], a, b);
          const actual = 1 - (pixels[(y * 9 + x) * 4] ?? NaN) / 255;
          const error = Math.abs(expected - actual);
          if (error > maximumError) {
            maximumError = error;
            worst = { index, angle, x, y, expected, actual };
          }
          cases++;
        }
      await retireRenderer(renderer);
    }
  // Coverage-value gate is separate from the geometric quarter-device-pixel budget.
  // 8-step search + bounded host float allowance + RGBA8 readback quantization.
  const coverageAllowance = 1 / 256 + 0.004 + 1 / 255;
  if (!Number.isFinite(maximumError) || maximumError > coverageAllowance)
    throw Error(`taper coverage ${maximumError}: ${JSON.stringify(worst)}`);
  return {
    cases,
    maximumError,
    coverageAllowance,
    worst,
    scope:
      "bounded realGPU varying-radius coverage versus independent f64 disc-union maximization; not exhaustive",
  };
}
