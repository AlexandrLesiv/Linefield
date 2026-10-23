import { currentCoverage } from "./current-coverage.ts";
import { framePanReuse } from "./frame-pan-reuse.ts";
import { frames } from "./frame-bridge.ts";
import { cleanupRelease } from "./cleanup-failure.ts";
import { coverageObservation } from "./coverage-observation.ts";
import type { Receipt } from "./frame-receipt.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { CandidatePolicy } from "./candidate-policy.ts";
export function recaptureCandidate(
  previous: Receipt,
  state: ReplyValue,
  renderer: GpuRenderer,
  policy: CandidatePolicy,
) {
  const q = currentCoverage(state, 0n, 0n, previous.id);
  if (q.code !== "ok") throw Error(q.code);
  if (!q.candidateRecaptureSafe) return;
  const next = policy.capture(state, renderer);
  if (next.code === "capacity") return;
  if (next.code !== "ok") throw Error(next.code);
  let accepted = false;
  try {
    // Ready bitmap metadata is immutable. An eligible recipe requires identical phase.
    if (previous.recipe?.eligible) {
      const match = framePanReuse(state, previous.id, next.id);
      if (match.code !== "ok") throw Error(match.code);
      if (!match.reusable || match.shift[0] || match.shift[1]) return "phase-miss" as const;
    }
    cleanupRelease(() => frames.release(state, previous.id));
    accepted = true;
    if (import.meta.env.MODE === "performance-e2e" && previous.recipe?.eligible)
      coverageObservation(state, "pan-recapture", next.id, {
        epoch: renderer.epoch,
        fromReceipt: `${previous.id}`,
      });
    return { ...next, ...(previous.recipe ? { recipe: previous.recipe } : {}) };
  } finally {
    if (!accepted) cleanupRelease(() => frames.release(state, next.id));
  }
}
