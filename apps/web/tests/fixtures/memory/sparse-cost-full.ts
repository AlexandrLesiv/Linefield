import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import type { CostGroup } from "./sparse-cost-source.ts";
import type { SparseTimes } from "./sparse-ordered.ts";
import {
  sparseBudgetReady,
  sparseBudgetStart,
  sparseBudgetEnd,
  sparseYield,
} from "./sparse-budget.ts";
export function costClear(renderer: GpuRenderer, scene: boolean) {
  if (scene && renderer.resources.packed) {
    const gl = renderer.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderer.resources.staging.framebuffer);
    gl.disable(gl.SCISSOR_TEST);
    gl.colorMask(false, false, false, true);
    gl.clearColor(0, 0, 0, 96 / 255);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }
  renderer.begin(scene);
}
// Ordinary GpuPass owns its real scissored clears/composite. No per-group CPU
// validation is added to this control; only normal two-slot backpressure applies.
export async function sparseCostFull(
  renderer: GpuRenderer,
  groups: readonly CostGroup[],
  stats: SparseTimes,
  clearScene: boolean,
  dirtyAtlas = false,
) {
  let group = 0,
    page = -1,
    begun = false;
  do {
    await sparseBudgetReady(stats);
    const wait = performance.now();
    await renderer.slot();
    stats.slot += performance.now() - wait;
    const started = sparseBudgetStart(stats),
      deadline = stats.budget.deadline;
    let commands = 0;
    try {
      if (!begun && (clearScene || dirtyAtlas)) costClear(renderer, clearScene);
      begun = true;
      while (
        group < groups.length &&
        commands < 256 &&
        stats.budget.remaining > 0 &&
        performance.now() < deadline
      ) {
        const current = groups[group];
        if (!current) throw Error("cost group");
        if (page < 0) {
          renderer.group();
          page = 0;
        } else if (page < current.pages.length) {
          const source = current.pages[page++];
          if (!source) throw Error("cost page");
          renderer.draw(source.data, source.matrix, current.color);
          stats.geometry++;
        } else {
          renderer.composite();
          group++;
          page = -1;
          stats.presented++;
        }
        commands++;
        stats.budget.remaining--;
      }
    } finally {
      stats.serial = renderer.check();
      stats.issueTime = performance.now();
      sparseBudgetEnd(stats, started, "submissionCpu");
    }
    if (group < groups.length) {
      await sparseYield(stats);
    }
  } while (group < groups.length);
}
