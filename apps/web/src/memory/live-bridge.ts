import * as api from "#memory-bindings";
import { take } from "./edit-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
const value = (v: api.PreparationSnapshot) => ({
  code: v.code,
  token: v.token,
  through: v.through,
  points: v.points,
  parameters: v.parameters,
});
export const live = {
  stable: (s: ReplyValue, stroke: bigint, from: bigint, detail: number, frame: bigint) =>
    take(
      () =>
        api.memoryFrameStablePreparation(s.owner, s.session, s.scene, stroke, from, frame, detail),
      value,
    ),
  tail: (s: ReplyValue, stroke: bigint, from: bigint, detail: number, frame: bigint) =>
    take(
      () =>
        api.memoryFrameTailPreparation(s.owner, s.session, s.scene, stroke, from, frame, detail),
      value,
    ),
  placement: (s: ReplyValue, frame: bigint, stroke: bigint, page: bigint) =>
    take(
      () => api.memoryLivePlacement(s.owner, s.session, frame, stroke, page),
      (v) => ({ code: v.code, available: v.available, matrix: v.matrix }),
    ),
  append: (s: ReplyValue, frame: bigint, stroke: bigint) =>
    take(
      () => api.memoryFrameAppend(s.owner, s.session, frame, stroke),
      (v) => ({
        code: v.code,
        id: v.frameId,
        through: v.page,
        key: `${v.frameContent}:${v.frameMapping}`,
      }),
    ),
};
