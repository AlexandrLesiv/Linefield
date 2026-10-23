import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import type { SparseGpu } from "../../../src/memory/sparse-gpu.ts";
import type { SparsePlan } from "../../../src/memory/sparse-plan.ts";
import {
  sparseBudgetReady,
  sparseBudgetStart,
  sparseBudgetEnd,
  sparseYield,
} from "./sparse-budget.ts";
import type { SparseTimes } from "./sparse-budget.ts";
export { sparseTimes } from "./sparse-budget.ts";
export type { SparseTimes } from "./sparse-budget.ts";
import { retireRenderer } from "./retire-renderer.ts";
import { costClear } from "./sparse-cost-full.ts";
export async function sparseOrdered(
  renderer: GpuRenderer,
  executor: SparseGpu,
  plan: SparsePlan,
  data: Float32Array,
  matrix: Float32Array,
  color: readonly number[],
  stats: SparseTimes,
  clearScene = false,
) {
  let geometry = 0,
    presented = 0;
  try {
    const entryWait = performance.now();
    await executor.reset(plan, stats.serial);
    stats.validation += performance.now() - entryWait;
    while (true) {
      await sparseBudgetReady(stats);
      const started = sparseBudgetStart(stats);
      const done = executor.preparePresenter(plan, stats.budget);
      sparseBudgetEnd(stats, started, "preparationCpu");
      if (done) break;
      await sparseYield(stats);
    }
    let cleared = false;
    do {
      await sparseBudgetReady(stats);
      const waiting = performance.now();
      await renderer.slot();
      stats.slot += performance.now() - waiting;
      const started = sparseBudgetStart(stats),
        deadline = stats.budget.deadline;
      let area = 0,
        tiles = 0;
      try {
        if (!cleared) {
          costClear(renderer, clearScene);
          cleared = true;
        }
        while (
          geometry < plan.routes.descriptors &&
          stats.budget.remaining > 0 &&
          performance.now() < deadline
        ) {
          const first = plan.storage.descriptors[geometry * 8] ?? 0;
          const next = plan.storage.projection[first * 6 + 4] ?? NaN;
          if (!Number.isSafeInteger(next) || next > 65536) throw Error("draw sample cap");
          if (area + next > 262144) break;
          executor.geometry(plan, data, matrix, color, geometry++);
          stats.budget.remaining--;
          stats.geometry++;
          area += next;
        }
        // Bank1 is distinct and prepared before reservation. Context ordering
        // supplies G→S visibility; neither bank is rewritten before completion.
        while (
          geometry === plan.routes.descriptors &&
          presented < plan.routes.slots &&
          tiles < 64 &&
          stats.budget.remaining > 0 &&
          performance.now() < deadline
        ) {
          const count = Math.min(
            16,
            plan.routes.slots - presented,
            64 - tiles,
            stats.budget.remaining,
          );
          executor.present(plan, presented, count, color);
          presented += count;
          tiles += count;
          stats.presented++;
          stats.budget.remaining -= count;
        }
      } finally {
        stats.serial = renderer.check();
        executor.submitted(stats.serial);
        stats.issueTime = performance.now();
        sparseBudgetEnd(stats, started, "submissionCpu");
      }
      if (geometry < plan.routes.descriptors || presented < plan.routes.slots) {
        await sparseYield(stats);
      }
    } while (geometry < plan.routes.descriptors || presented < plan.routes.slots);
    const waiting = performance.now();
    await executor.complete();
    stats.validation += performance.now() - waiting;
  } catch (error) {
    // Any issue uncertainty is terminal for this isolated candidate. In
    // particular, a first-S write can never be followed by ordinary replay.
    await retireRenderer(renderer);
    executor.dispose();
    throw error;
  }
}
