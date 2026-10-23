import { captureViewDisplay } from "./current-coverage.ts";
import { consumeGraph } from "./display-graph.ts";
import { frames } from "./frame-bridge.ts";
import { cleanupRelease } from "./cleanup-failure.ts";
import { coverageObservation } from "./coverage-observation.ts";
import { composed } from "../developer-diagnostics/composition-observation.ts";
import type { Coverage } from "./current-coverage.ts";
import type { DisplayGraph } from "./display-graph.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { DisplayBase } from "./display-base.ts";
import type { CompletedCandidate } from "./completed-candidate.ts";
import type { LiveOwner } from "./live-owner.ts";
export function consumeViewCandidate(
  state: ReplyValue,
  renderer: GpuRenderer,
  base: DisplayBase,
  candidate: CompletedCandidate,
  live: LiveOwner,
  graph: () => DisplayGraph,
  q: Coverage,
) {
  if (
    !q.viewGestureActive ||
    q.candidateExactView ||
    !candidate.ready ||
    candidate.busy ||
    !q.candidateValid ||
    !q.candidateAtCutoff ||
    !q.candidateContentCurrent ||
    !candidate.receipt
  )
    return false;
  const transform = frames.transform(state, candidate.receipt.id);
  if (transform.code !== "ok") throw Error(transform.code);
  // Snapshot the complete painter order before any owner is stopped, disposed or swapped.
  const visible = { ...graph(), candidate: transform.matrix };
  const next = captureViewDisplay(state, candidate.receipt.id);
  if (next.code === "capacity") return false;
  if (next.code !== "ok") throw Error(next.code);
  let transferred = false;
  try {
    consumeGraph(renderer, visible);
    // publish adopts incoming ownership before fallible old-owner release. Any failure
    // propagates to scene retirement; the pre-swap graph must never be silently resumed.
    transferred = true;
    base.publish(next, renderer, false);
    composed(state, next.id, candidate.receipt.id);
    coverageObservation(state, "view-consume", next.id);
    candidate.cancel();
    if (q.liveState === "ended" || q.liveState === "included") live.dispose();
    return true;
  } finally {
    if (!transferred) cleanupRelease(() => frames.release(state, next.id));
  }
}
