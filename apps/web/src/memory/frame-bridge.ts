import * as api from "#memory-bindings";
import { copyReply, take } from "./edit-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export const frames = {
  ready: (s: ReplyValue, id: bigint) =>
    take(() => api.memoryDisplayReady(s.owner, s.session, s.mapping, id), copyReply),
  capture: (s: ReplyValue) =>
    take(
      () => api.memoryFrameCapture(s.owner, s.session, s.mapping),
      (v) => ({
        code: v.code,
        id: v.frameId,
        through: v.page,
        key: `${v.frameContent}:${v.frameMapping}`,
      }),
    ),
  transform: (s: ReplyValue, id: bigint) =>
    take(
      () => api.memoryFrameTransform(s.owner, s.session, s.mapping, id),
      (v) => ({ code: v.code, matrix: v.matrix, available: v.available }),
    ),
  release: (s: ReplyValue, id: bigint) =>
    take(
      () => api.memoryFrameRelease(s.owner, s.session, id),
      (v) => v.code,
    ),
  preparation: (
    s: ReplyValue,
    stroke: bigint,
    chunk: bigint,
    revision: bigint,
    detail: number,
    frame: bigint,
  ) =>
    take(
      () =>
        api.memoryFramePreparation(
          s.owner,
          s.session,
          s.scene,
          stroke,
          chunk,
          revision,
          detail,
          frame,
        ),
      (v) => ({ code: v.code, token: v.token, parameters: v.parameters, points: v.points }),
    ),
  coverage: (s: ReplyValue, token: bigint, frame: bigint) =>
    take(
      () => api.memoryFramePreparationCoverage(s.owner, s.session, token, frame),
      (v) => v.code === "ok" && v.page === 1n,
    ),
  placement: (s: ReplyValue, frame: bigint, stroke: bigint, page: bigint) =>
    take(
      () => api.memoryFramePlacement(s.owner, s.session, frame, stroke, page),
      (v) => ({ code: v.code, available: v.available, matrix: v.matrix }),
    ),
};
