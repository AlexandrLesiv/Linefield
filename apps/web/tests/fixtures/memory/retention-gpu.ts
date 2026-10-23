import { GpuArena } from "../../../src/memory/gpu-arena.ts";
import { geometryMetrics as metrics } from "../../../src/memory/geometry-metrics.ts";
import { assertions } from "./tail-fixture.ts";
export async function retentionGpu(canvas: HTMLCanvasElement, countPressure = false) {
  const { check, report } = assertions();
  const gl = canvas.getContext("webgl2");
  if (!gl) throw Error("fixture WebGL2");
  const scratch = gl.createBuffer();
  if (!scratch) throw Error("fixture scratch");
  gl.bindBuffer(gl.ARRAY_BUFFER, scratch);
  gl.bufferData(gl.ARRAY_BUFFER, 32768, gl.DYNAMIC_DRAW);
  // Real allocator with an explicit small target-residual budget; no rendered-source claim.
  const capacity = countPressure ? 262144 : 65536;
  const count = countPressure ? 4096 : 2;
  const size = countPressure ? 32 : 32768;
  const arena = new GpuArena(gl, scratch, 192 * 1024 ** 2 - 256 * 1024 - capacity);
  const data = new Float32Array(countPressure ? 6 : 6144);
  const turn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
  try {
    arena.maintain();
    const a = arena.protect();
    if (countPressure) {
      arena.get(99999n, new Float32Array(32768));
      arena.maintain();
      arena.get(99999n, new Float32Array(32768));
      arena.maintain();
    }
    for (let i = 1; i <= count; i++) check(!!arena.get(BigInt(i), data), "A resident admitted");
    arena.unprotect(a, true);
    const b = arena.protect();
    check(!arena.get(5000n, data), "B streams against protected full arena");
    check(!!arena.get(1n, data), "late A still resident");
    check(metrics.gpuLive === count * size, "no active-pass pressure eviction");
    arena.unprotect(b, true);
    for (let i = 0; i < 100 && metrics.gpuLive === count * size; i++) await turn();
    check(metrics.gpuLive === (count - 1) * size, "idle retires only unused A range");
    const next = arena.protect();
    const uploads = metrics.gpuUploads;
    check(!!arena.get(1n, data), "A hit remains valid after idle retirement");
    check(metrics.gpuUploads === uploads, "late A lookup performs zero uploads");
    check(!!arena.get(5000n, data), "future B occupies reclaimed capacity");
    arena.unprotect(next, false);
    check(arena.bytes === capacity, "logical eviction never pretends GPU slab bytes were freed");
    return {
      ...report(),
      allocated: arena.bytes,
      live: metrics.gpuLive,
      scope: "actual WebGL allocator boundary; not raster, physical input or performance evidence",
    };
  } finally {
    arena.dispose();
    gl.deleteBuffer(scratch);
  }
}
