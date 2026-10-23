import type { allocateGpu } from "./gpu-allocation.ts";
/** RGB-image generation, independent of packed alpha masks and texture reuse. */
export function changedBase(r: ReturnType<typeof allocateGpu>) {
  if (!r.baseReusable) return;
  if (r.baseGeneration === Number.MAX_SAFE_INTEGER) {
    r.baseReusable = false;
    return;
  }
  r.baseGeneration++;
}
