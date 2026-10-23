import type { SparseStorage } from "./sparse-storage.ts";
import { SparseProjection, sparseViewport } from "./sparse-projection.ts";
import { SparseRoutes } from "./sparse-routes.ts";
import type { SparseWork } from "./sparse-routes.ts";
export class SparsePlan {
  readonly storage: SparseStorage;
  readonly projection: SparseProjection;
  readonly routes: SparseRoutes;
  readonly count: number;
  reason = "";
  transitions = 0;
  private cursor = 0;
  private data: Float32Array;
  constructor(
    storage: SparseStorage,
    data: Float32Array,
    matrix: Float32Array,
    width: number,
    height: number,
    precision: number,
    subpixels: number,
    work: SparseWork,
  ) {
    this.storage = storage;
    this.projection = new SparseProjection(storage);
    this.data = data;
    this.count = data.length / 6;
    this.routes = new SparseRoutes(this.storage, this.count, width, height, work, ++storage.stamp);
    if (
      storage.stamp >= 0xffffffff ||
      work.disabled ||
      !Number.isInteger(this.count) ||
      this.count < 1 ||
      this.count > 1024 ||
      !sparseViewport(this.projection.interval, width, height, precision, subpixels) ||
      !this.projection.begin(matrix)
    )
      this.reason = "numerical-admission";
  }
  private bounds(capsule: number) {
    const s = this.storage,
      span = Math.floor(capsule / 2),
      coarse = Math.floor(span / 16);
    for (let axis = 0; axis < 4; axis++) {
      const value = s.projection[capsule * 6 + axis] ?? NaN;
      const combine = axis < 2 ? Math.min : Math.max;
      s.fine[span * 4 + axis] =
        capsule % 2 ? combine(s.fine[span * 4 + axis] ?? value, value) : value;
      s.coarse[coarse * 4 + axis] =
        capsule % 32 ? combine(s.coarse[coarse * 4 + axis] ?? value, value) : value;
    }
  }
  step(budget: { deadline: number; remaining: number }): "pending" | "done" | "refused" {
    if (this.reason) return "refused";
    while (budget.remaining > 0 && performance.now() < budget.deadline) {
      budget.remaining--;
      this.transitions++;
      if (this.cursor < this.count) {
        if (!this.projection.capsule(this.data, this.cursor, this.storage.projection)) {
          this.reason = "projection-enclosure";
          return "refused";
        }
        this.routes.work.visited++;
        this.bounds(this.cursor++);
      } else {
        const status = this.routes.transition();
        if (status !== "pending") {
          this.reason = this.routes.reason;
          if (this.routes.work.area > 16777216 || this.routes.work.instances > 3000000)
            this.routes.work.disabled = true;
          return status;
        }
      }
    }
    return "pending";
  }
}
