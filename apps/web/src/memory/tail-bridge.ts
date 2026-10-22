import * as api from "#memory-bindings";
import { take } from "./edit-bridge.ts";
import { editorHealthy } from "./editor-health.ts";
import type { ReplyValue } from "./bridge.ts";
const status = (v: api.TailDisplaySnapshot) => ({
  code: v.code,
  id: v.id,
  stroke: v.stroke,
  count: v.count,
  from: v.from,
  anchor: v.anchorFrame,
  complete: v.complete,
  exact: v.exactSource,
});
export const tail = {
  transform: (s: ReplyValue, id: bigint) =>
    take(
      () => api.memoryTailDisplayTransform(s.owner, s.session, s.mapping, id),
      (v) => ({ code: v.code, available: v.available, matrix: v.matrix }),
    ),
  capture: (s: ReplyValue, stroke: bigint, frame: bigint, from: bigint, detail: number) =>
    take(
      () => api.memoryTailDisplayCapture(s.owner, s.session, s.scene, stroke, frame, from, detail),
      status,
    ),
  status: (s: ReplyValue, id: bigint) =>
    take(() => api.memoryTailDisplayStatus(s.owner, s.session, s.mapping, id), status),
  prepare: (s: ReplyValue, id: bigint) =>
    take(
      () => api.memoryTailDisplayPreparation(s.owner, s.session, s.mapping, id),
      (v) => ({
        code: v.code,
        token: v.token,
        through: v.through,
        points: v.points,
        parameters: v.parameters,
      }),
    ),
  adopt: (
    s: ReplyValue,
    id: bigint,
    token: bigint,
    ordinal: bigint,
    data: Float32Array,
    origin: Float64Array,
  ) =>
    take(
      () => api.memoryTailDisplayAdopt(s.owner, s.session, id, token, ordinal, data, origin),
      (v) => ({ code: v.code, page: v.page }),
    ),
  placement: (s: ReplyValue, id: bigint, page: bigint) =>
    take(
      () => api.memoryTailDisplayPlacement(s.owner, s.session, s.mapping, id, page),
      (v) => ({ code: v.code, available: v.available, matrix: v.matrix }),
    ),
  complete: (s: ReplyValue, id: bigint, token: bigint, ordinal: bigint) =>
    take(
      () => api.memoryTailDisplayCompletePreparation(s.owner, s.session, id, token, ordinal),
      (v) => v.code,
    ),
  release: (s: ReplyValue, id: bigint) =>
    editorHealthy()
      ? take(
          () => api.memoryTailDisplayRelease(s.owner, s.session, id),
          (v) => v.code,
        )
      : "disposed",
};
