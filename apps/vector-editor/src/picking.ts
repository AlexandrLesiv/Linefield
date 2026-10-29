import type { Core } from "./core";
import type { GeometryData } from "./derived-geometry";

/** Copy only a bounded disposable batch; Rust owns the hit predicate.
 * Retained compact endpoints (stride 3) and full capsules (stride 6) agree.
 * No document mutation, geometry regeneration or cache invalidation occurs.
 */
export function pickCapsules(
  core: Core,
  data: GeometryData,
  stride: number,
  x: number,
  y: number,
  pad: number,
): boolean {
  if (stride !== 3 && stride !== 6) throw Error("Unsupported capsule stride");
  const pointer = core.pick_input_ptr();
  const input = new Float64Array(core.memory.buffer, pointer, 256 * 6);
  let offset = 0;
  while (offset + 5 < data.length) {
    let count = 0;
    while (count < 256 && offset + 5 < data.length) {
      for (let j = 0; j < 6; j++) input[count * 6 + j] = data[offset + j];
      count++;
      offset += stride;
    }
    const result = core.pick_capsules(count, x, y, pad);
    if (result === 2) throw Error("Invalid Pick geometry batch");
    if (result === 1) return true;
  }
  return false;
}
