import type { PreparationTrace } from "./preparation-ticket.ts";
import { observePreparation } from "./preparation-record.ts";
export type PreparationOutcome = "completed" | "stale" | "rejected" | undefined;
export function stalePreparation(
  trace: PreparationTrace | undefined,
  message: "stale-scene" | "stale-mapping",
): Error {
  observePreparation(() => trace?.cause("stale"));
  return Error(message);
}
/** Observation follows the owner's unchanged nested cleanup, including generator return. */
export function finishPreparation(
  trace: PreparationTrace | undefined,
  ordinal: bigint,
  outcome: PreparationOutcome,
  cleanup: () => void,
) {
  const count = ordinal <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(ordinal) : undefined;
  try {
    cleanup();
  } catch (error) {
    observePreparation(() => {
      trace?.cleanupFailure();
      trace?.outcome("rejected", count);
    });
    throw error;
  }
  observePreparation(() => {
    if (outcome) trace?.outcome(outcome, count);
    else trace?.abandoned(count);
  });
}
