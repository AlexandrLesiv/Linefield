import * as api from "#memory-bindings";
import { editorHealthy } from "./editor-health.ts";
import { take } from "./edit-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export const preparation = {
  stable: (s: ReplyValue, stroke: bigint, from: bigint, detail: number) =>
    take(
      () => api.memoryStablePreparation(s.owner, s.session, s.scene, stroke, from, detail),
      (v) => ({
        code: v.code,
        token: v.token,
        through: v.through,
        parameters: v.parameters,
        points: v.points,
      }),
    ),
  begin: (s: ReplyValue, stroke: bigint, chunk: bigint, revision: bigint, detail: number) =>
    take(
      () => api.memoryPreparation(s.owner, s.session, s.scene, stroke, chunk, revision, detail),
      (v) => ({ code: v.code, token: v.token, parameters: v.parameters, points: v.points }),
    ),
  adopt: (
    s: ReplyValue,
    token: bigint,
    ordinal: bigint,
    data: Float32Array,
    origin: Float64Array,
  ) =>
    take(
      () => api.memoryAdoptPreparation(s.owner, s.session, token, ordinal, data, origin),
      (v) => ({ code: v.code, page: v.page }),
    ),
  complete: (s: ReplyValue, token: bigint, ordinal: bigint) =>
    take(
      () => api.memoryCompletePreparation(s.owner, s.session, token, ordinal),
      (v) => v.code,
    ),
  current: (s: ReplyValue, token: bigint) =>
    take(
      () => api.memoryPreparationCurrent(s.owner, s.session, token),
      (v) => v.code,
    ),
  coverage: (s: ReplyValue, token: bigint) =>
    take(
      () => api.memoryPreparationCoverage(s.owner, s.session, token),
      (v) => v.code === "ok" && v.page === 1n,
    ),
  release: (s: ReplyValue, token: bigint) =>
    editorHealthy()
      ? take(
          () => api.memoryReleasePreparation(s.owner, s.session, token),
          (v) => v.code,
        )
      : "disposed",
};
