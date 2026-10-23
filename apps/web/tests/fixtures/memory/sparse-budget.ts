import { commandTurn } from "../../../src/memory/frame-commands.ts";
export type SparseTimes = {
  cpu: number;
  planningCpu: number;
  preparationCpu: number;
  submissionCpu: number;
  slot: number;
  validation: number;
  yields: number;
  geometry: number;
  presented: number;
  serial: number;
  issueTime: number;
  milliseconds: number;
  budget: { deadline: number; remaining: number };
};
export const sparseTimes = (): SparseTimes => ({
  cpu: 0,
  planningCpu: 0,
  preparationCpu: 0,
  submissionCpu: 0,
  slot: 0,
  validation: 0,
  yields: 0,
  geometry: 0,
  presented: 0,
  serial: 0,
  issueTime: 0,
  milliseconds: 2,
  budget: { deadline: 0, remaining: 1024 },
});
export async function sparseYield(stats: SparseTimes) {
  stats.yields++;
  await commandTurn();
  stats.milliseconds = 2;
  stats.budget.remaining = 1024;
}
export async function sparseBudgetReady(stats: SparseTimes) {
  if (stats.milliseconds <= 0 || stats.budget.remaining <= 0) await sparseYield(stats);
}
export function sparseBudgetStart(stats: SparseTimes) {
  const started = performance.now();
  stats.budget.deadline = started + Math.max(0, stats.milliseconds);
  return started;
}
export function sparseBudgetEnd(
  stats: SparseTimes,
  started: number,
  phase: "planningCpu" | "preparationCpu" | "submissionCpu" = "planningCpu",
) {
  const elapsed = performance.now() - started;
  stats.cpu += elapsed;
  stats[phase] += elapsed;
  stats.milliseconds -= elapsed;
}
