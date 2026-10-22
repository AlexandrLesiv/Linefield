import * as api from "#memory-bindings";
import { take } from "./edit-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export const currentCoverage = (s: ReplyValue, live = 0n, installed = 0n, candidate = 0n) =>
  take(
    () => api.memoryCurrentCoverage(s.owner, s.session, s.mapping, live, installed, candidate),
    (v) => ({
      code: v.code,
      completedCount: v.completedCount,
      completedThrough: v.completedThrough,
      completedContent: v.completedContent,
      activeSource: v.activeSource,
      activeCount: v.activeCount,
      viewGestureActive: v.viewGestureActive,
      canFold: v.canFold,
      liveState: v.liveState,
      liveSource: v.liveSource,
      liveCount: v.liveCount,
      installedValid: v.installedValid,
      candidateValid: v.candidateValid,
      candidateCount: v.candidateCount,
      candidateThrough: v.candidateThrough,
      nextSource: v.nextSource,
      nextCount: v.nextCount,
      candidateAtCutoff: v.candidateAtCutoff,
      candidateContentCurrent: v.candidateContentCurrent,
      candidateViewCurrent: v.candidateViewCurrent,
      candidateMappingCurrent: v.candidateMappingCurrent,
      candidateRecaptureSafe: v.candidateRecaptureSafe,
      candidateExactView: v.candidateExactView,
      candidateIncludesLive: v.candidateIncludesLive,
    }),
  );
export type Coverage = ReturnType<typeof currentCoverage>;
export const captureLive = (s: ReplyValue, source: bigint) =>
  take(
    () => api.memoryLiveFrameCapture(s.owner, s.session, s.mapping, source),
    (v) => ({
      code: v.code,
      id: v.frameId,
      source: v.source,
      count: v.sourceCount,
      ordinal: v.ordinal,
      mapping: v.frameMapping,
    }),
  );
export const captureDisplay = (s: ReplyValue) =>
  take(
    () => api.memoryDisplayFrameCapture(s.owner, s.session, s.mapping),
    (v) => ({
      code: v.code,
      id: v.frameId,
      through: v.cutoffThrough,
      count: v.cutoffCount,
      key: `0:${v.frameMapping}`,
    }),
  );
