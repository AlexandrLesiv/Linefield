import { SparsePlan } from "../../../src/memory/sparse-plan.ts";
import type { SparseGpu } from "../../../src/memory/sparse-gpu.ts";
import type { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { sparseTimes, sparseOrdered } from "./sparse-ordered.ts";
import { sparseBudgetStart, sparseBudgetEnd, sparseYield } from "./sparse-budget.ts";
import { sparseCostFull } from "./sparse-cost-full.ts";
import { sparseCostPixels } from "./sparse-cost-pixels.ts";
import { samplingDifference } from "./sampling-pixels.ts";
const color = [0.2, 0.4, 0.8, 0.5];
// Controlled real generated-page/GL integration, outside the timing endpoint.
export async function sparseEntryControl(
  renderer: GpuRenderer,
  executor: SparseGpu,
  plan: SparsePlan,
  data: Float32Array,
  matrix: Float32Array,
  reference: Uint8Array,
) {
  const stats = sparseTimes(),
    gl = renderer.gl;
  await sparseCostFull(
    renderer,
    [{ pages: [{ data, matrix, id: 0n }], color, samples: 4 }],
    stats,
    true,
  );
  const ordinarySerial = stats.serial,
    wait = gl.clientWaitSync.bind(gl),
    clear = gl.clear.bind(gl);
  let held = true,
    polls = 0,
    signaled = 0,
    clears = 0,
    completed = false;
  gl.clientWaitSync = (...args) => {
    const status = wait(...args);
    if (status === gl.ALREADY_SIGNALED || status === gl.CONDITION_SATISFIED) signaled++;
    if (held) {
      polls++;
      return gl.TIMEOUT_EXPIRED;
    }
    return status;
  };
  gl.clear = (mask) => {
    clears++;
    clear(mask);
  };
  plan.storage.routes[65536] = -32768;
  const pending = sparseOrdered(renderer, executor, plan, data, matrix, color, stats, true).then(
    () => {
      completed = true;
    },
  );
  let blocked;
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 30));
    blocked = { polls, clears, completed, untouched: plan.storage.routes[65536] === -32768 };
  } finally {
    held = false;
    try {
      await pending;
    } finally {
      gl.clientWaitSync = wait;
      gl.clear = clear;
    }
  }
  const entryDifference = samplingDifference(sparseCostPixels(renderer), reference);
  if (
    !blocked.polls ||
    blocked.clears ||
    blocked.completed ||
    !blocked.untouched ||
    !signaled ||
    !clears ||
    stats.serial <= ordinarySerial ||
    entryDifference.changed ||
    !entryDifference.ink
  )
    throw Error(
      `full→sparse reader ${JSON.stringify({ blocked, signaled, clears, entryDifference })}`,
    );

  // Re-run the actual whole-page planner, ending its final slice exactly at the
  // already-observed transition count. No generated geometry is changed.
  const subpixels: unknown = gl.getParameter(gl.SUBPIXEL_BITS);
  const next = new SparsePlan(
    plan.storage,
    data,
    matrix,
    renderer.width,
    renderer.height,
    gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)?.precision ?? 0,
    typeof subpixels === "number" ? subpixels : 0,
    { visited: 0, entries: 0, instances: 0, area: 0, disabled: false },
  );
  const budgetStats = sparseTimes();
  let status: "pending" | "done" | "refused" = "pending";
  while (status === "pending") {
    budgetStats.budget.remaining = Math.min(1024, plan.transitions - next.transitions);
    if (budgetStats.budget.remaining <= 0) throw Error("changed planner work");
    const start = sparseBudgetStart(budgetStats);
    status = next.step(budgetStats.budget);
    sparseBudgetEnd(budgetStats, start);
    if (status === "pending") await sparseYield(budgetStats);
  }
  if (status !== "done" || budgetStats.budget.remaining !== 0) throw Error("final plan quota");
  let planTask = false,
    prepTask = false,
    earlyPrep = false,
    earlyGeometry = false;
  let prepared = 0,
    reservations = 0,
    heldDuringYield = false;
  const prepare = executor.preparePresenter.bind(executor),
    geometry = executor.geometry.bind(executor);
  const slot = renderer.slot.bind(renderer),
    check = renderer.check.bind(renderer);
  renderer.slot = async () => {
    await slot();
    reservations++;
  };
  renderer.check = () => {
    reservations--;
    return check();
  };
  setTimeout(() => {
    planTask = true;
    heldDuringYield ||= reservations !== 0;
  }, 0);
  executor.preparePresenter = (p, budget) => {
    earlyPrep ||= !planTask;
    budget.remaining = Math.min(budget.remaining, 1024 - prepared);
    const before = budget.remaining,
      done = prepare(p, budget);
    prepared += before - budget.remaining;
    if (done)
      setTimeout(() => {
        prepTask = true;
        heldDuringYield ||= reservations !== 0;
      }, 0);
    return done;
  };
  executor.geometry = (...args) => {
    earlyGeometry ||= !prepTask;
    geometry(...args);
  };
  const yieldsBefore = budgetStats.yields;
  try {
    await sparseOrdered(renderer, executor, next, data, matrix, color, budgetStats, true);
  } finally {
    executor.preparePresenter = prepare;
    executor.geometry = geometry;
    renderer.slot = slot;
    renderer.check = check;
  }
  const budgetDifference = samplingDifference(sparseCostPixels(renderer), reference);
  const budget = {
    planTask,
    prepTask,
    earlyPrep,
    earlyGeometry,
    heldDuringYield,
    prepared,
    yields: budgetStats.yields - yieldsBefore,
    difference: budgetDifference,
  };
  if (
    !planTask ||
    !prepTask ||
    earlyPrep ||
    earlyGeometry ||
    heldDuringYield ||
    prepared !== 1024 ||
    budget.yields < 2 ||
    budgetDifference.changed ||
    !budgetDifference.ink
  )
    throw Error(`phase budget ${JSON.stringify(budget)}`);
  return {
    ordinarySerial,
    sparseSerial: stats.serial,
    blocked,
    signaled,
    clears,
    entryDifference,
    budget,
  };
}
