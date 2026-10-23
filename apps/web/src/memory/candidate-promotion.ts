import { frames } from "./frame-bridge.ts";
import type { CompletedCandidate } from "./completed-candidate.ts";
import type { Coverage } from "./current-coverage.ts";
import type { DisplayBase } from "./display-base.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { ReplyValue } from "./bridge.ts";
export function promoteCandidate(
  state: ReplyValue,
  candidate: CompletedCandidate,
  base: DisplayBase,
  renderer: GpuRenderer,
  q: Coverage,
) {
  if (!candidate.ready || candidate.busy || !candidate.receipt) return false;
  if (!q.candidateExactView) return false;
  if (candidate.sealed && !q.viewGestureActive) return false;
  if (frames.transform(state, candidate.receipt.id).code !== "ok") return false;
  // Exact current pixels cover the full viewport. Older-view candidates must preserve
  // the visible graph through consumeViewCandidate instead of dropping B's footprint.
  candidate.sealed = false;
  const next = candidate.take();
  if (!next) throw Error("gpu-queue");
  renderer.promote();
  base.publish(next, renderer, true);
  return true;
}
