import type { Coverage } from "./current-coverage.ts";
import type { DisplayBase } from "./display-base.ts";
import type { LiveOwner } from "./live-owner.ts";
import type { ReplyValue } from "./bridge.ts";
export function retainingEnded(q: Coverage, live: LiveOwner) {
  return (
    q.liveState === "ended" &&
    !q.activeSource &&
    !q.candidateIncludesLive &&
    live.value?.through !== q.liveCount
  );
}
export function inputCovered(q: Coverage, base: DisplayBase, live: LiveOwner, state: ReplyValue) {
  return (
    base.prefix &&
    !base.historical &&
    !q.viewGestureActive &&
    base.receipt?.key === `${state.content}:${state.mapping}` &&
    (!q.activeSource || (q.liveState === "active" && !!live.value?.covers(q.liveCount)))
  );
}
