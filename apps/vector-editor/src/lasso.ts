import type { Core } from "./core";
import type { GeometryData } from "./derived-geometry";
import { type StrokeTransform, transformPoint, transformScale } from "./stroke-transform";
export type LassoPoint = readonly [number, number];

/** Thin synchronous query adapter. Rust owns closure, containment and edge tests. */
export class LassoRegion {
  readonly bounds = [Infinity, Infinity, -Infinity, -Infinity];
  constructor(
    private core: Core,
    points: readonly LassoPoint[],
  ) {
    core.lasso_reset();
    try {
      for (let offset = 0; offset < points.length; offset += 768) {
        // Appending may grow Wasm memory; reacquire scratch for each batch.
        const input = new Float64Array(core.memory.buffer, core.pick_input_ptr(), 1536);
        const count = Math.min(768, points.length - offset);
        for (let i = 0; i < count; i++) {
          const p = points[offset + i];
          input[i * 2] = p[0];
          input[i * 2 + 1] = p[1];
          this.bounds[0] = Math.min(this.bounds[0], p[0]);
          this.bounds[1] = Math.min(this.bounds[1], p[1]);
          this.bounds[2] = Math.max(this.bounds[2], p[0]);
          this.bounds[3] = Math.max(this.bounds[3], p[1]);
        }
        if (!core.lasso_append(count)) throw Error("Lasso point batch rejected");
      }
      if (!core.lasso_finish()) throw Error("Lasso closure failed");
    } catch (error) {
      core.lasso_reset();
      throw error;
    }
  }
  dispose() {
    this.core.lasso_reset();
  }
  overlaps(bounds: readonly number[]) {
    const b = this.bounds;
    return bounds[2] >= b[0] && bounds[0] <= b[2] && bounds[3] >= b[1] && bounds[1] <= b[3];
  }
  capsules(data: GeometryData, stride: number, transform: StrokeTransform, partial: boolean) {
    if (stride !== 3 && stride !== 6) throw Error("Unsupported capsule stride");
    const input = new Float64Array(this.core.memory.buffer, this.core.pick_input_ptr(), 1536);
    const scale = transformScale(transform);
    let offset = 0,
      flags = 0;
    while (offset + 5 < data.length) {
      let count = 0;
      while (count < 256 && offset + 5 < data.length) {
        const a = transformPoint(transform, data[offset], data[offset + 1]);
        const b = transformPoint(transform, data[offset + 3], data[offset + 4]);
        const target = count * 6;
        input[target] = a[0];
        input[target + 1] = a[1];
        input[target + 2] = data[offset + 2] * scale;
        input[target + 3] = b[0];
        input[target + 4] = b[1];
        input[target + 5] = data[offset + 5] * scale;
        count++;
        offset += stride;
      }
      const result = this.core.lasso_capsules(count, partial ? 1 : 0);
      if (result & 8) throw Error("Invalid Lasso geometry batch");
      flags |= result;
      if ((partial && flags & 2) || (!partial && flags & 4)) break;
    }
    return flags;
  }
}
