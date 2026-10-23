import { SparsePlan } from "../../../src/memory/sparse-plan.ts";
import type { SparseStorage } from "../../../src/memory/sparse-storage.ts";
import type { SparseGpu } from "../../../src/memory/sparse-gpu.ts";
import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import {
  sparseBudgetReady,
  sparseBudgetStart,
  sparseBudgetEnd,
  sparseYield,
} from "./sparse-budget.ts";
import { sparseTimes, sparseOrdered } from "./sparse-ordered.ts";
import { sparseCostFull } from "./sparse-cost-full.ts";
import type { CostGroup } from "./sparse-cost-source.ts";
export async function sparseCostPass(
  renderer: GpuRenderer,
  groups: readonly CostGroup[],
  optional?: { storage: SparseStorage; executor: SparseGpu },
) {
  const stats = sparseTimes(),
    gl = renderer.gl;
  const work = { visited: 0, entries: 0, instances: 0, area: 0, disabled: false };
  const precision = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)?.precision ?? 0;
  const subpixels: unknown = gl.getParameter(gl.SUBPIXEL_BITS);
  let admitted = 0,
    refused = 0,
    multipage = 0,
    originalDraws = 0,
    routeBytes = 0;
  const reasons: string[] = [];
  const started = performance.now();
  if (!optional) await sparseCostFull(renderer, groups, stats, true);
  else {
    let first = true,
      atlas = false;
    for (const group of groups) {
      let plan: SparsePlan | undefined,
        status: "pending" | "done" | "refused" = "refused";
      const source = group.pages[0];
      if (!source) throw Error("missing cost source");
      if (group.pages.length === 1) {
        await sparseBudgetReady(stats);
        const begin = sparseBudgetStart(stats);
        plan = new SparsePlan(
          optional.storage,
          source.data,
          source.matrix,
          renderer.width,
          renderer.height,
          precision,
          typeof subpixels === "number" ? subpixels : 0,
          work,
        );
        sparseBudgetEnd(stats, begin);
        status = "pending";
        while (status === "pending") {
          await sparseBudgetReady(stats);
          const start = sparseBudgetStart(stats);
          status = plan.step(stats.budget);
          sparseBudgetEnd(stats, start);
          if (status === "pending") {
            await sparseYield(stats);
          }
        }
      } else multipage++;
      if (status === "done" && plan) {
        admitted++;
        originalDraws += plan.routes.originalDescriptors;
        routeBytes +=
          (Math.ceil(plan.routes.entries / 1024) + Number(plan.routes.slots > 0)) * 1024 * 8;
        await sparseOrdered(
          renderer,
          optional.executor,
          plan,
          source.data,
          source.matrix,
          group.color,
          stats,
          first,
        );
        atlas = true;
      } else {
        refused++;
        reasons.push(plan?.reason ?? "multipage");
        await sparseCostFull(renderer, [group], stats, first, atlas);
        atlas = false;
      }
      first = false;
    }
  }
  const wait = performance.now();
  await renderer.validated(stats.serial);
  stats.validation += performance.now() - wait;
  const total = performance.now() - started;
  return {
    total,
    ...stats,
    issueToValidated: performance.now() - stats.issueTime,
    admitted,
    refused,
    multipage,
    originalDraws,
    routeBytes,
    reasons,
    work,
    geometryUploads: groups.reduce((sum, g) => sum + g.pages.length, 0),
    geometryBytes: groups.reduce(
      (sum, g) => sum + g.pages.reduce((n, p) => n + p.data.byteLength, 0),
      0,
    ),
  };
}
