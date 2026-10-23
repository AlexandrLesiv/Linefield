import { captureDisplay } from "./current-coverage.ts";
import { consumeGraph } from "./display-graph.ts";
import { frames } from "./frame-bridge.ts";
import { cleanupRelease } from "./cleanup-failure.ts";
import { coverageObservation } from "./coverage-observation.ts";
import type { Coverage } from "./current-coverage.ts";
import type { DisplayGraph } from "./display-graph.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { DisplayBase } from "./display-base.ts";
import type { CompletedCandidate } from "./completed-candidate.ts";
import type { LiveOwner } from "./live-owner.ts";
export function consumePrefix(
  state: () => ReplyValue,
  renderer: GpuRenderer,
  base: DisplayBase,
  candidate: CompletedCandidate,
  live: LiveOwner,
  graph: () => DisplayGraph,
  q: Coverage,
  detail: number,
) {
  if (!q.canFold) return false;
  if (q.liveState !== "active") live.value?.stopBack();
  // The mandatory fold owns its receipt BEFORE an optional candidate capture.
  const next = captureDisplay(state());
  if (next.code === "capacity") return false;
  if (next.code !== "ok") throw Error(next.code);
  let issued = false;
  try {
    const source = base.seedSource(renderer);
    if (source) candidate.seed(detail, source);
    consumeGraph(renderer, graph());
    issued = true;
    coverageObservation(state(), q.liveState === "active" ? "copyback" : "consume", next.id);
    base.publish(next, renderer, false);
    candidate.sealed = false;
    if (q.liveState !== "active") live.dispose();
    return true;
  } finally {
    if (!issued) cleanupRelease(() => frames.release(state(), next.id));
  }
}
