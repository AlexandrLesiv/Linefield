import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { gpuAdmission } from "../../../src/memory/gpu-retirement.ts";
export async function retireRenderer(renderer: GpuRenderer) {
  renderer.dispose();
  const deadline = performance.now() + 5000;
  while (!gpuAdmission()) {
    if (performance.now() > deadline) throw Error("fixture retirement timeout");
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}
