import * as api from "#memory-bindings";
import type { ReplyValue } from "./bridge.ts";
import { take } from "./edit-bridge.ts";
export const scene = {
  ids: (s: ReplyValue, after: bigint) =>
    take(
      () => api.memorySceneIds(s.owner, s.session, s.scene, after),
      (v) => ({ code: v.code, done: v.done, ids: v.ids }),
    ),
  stroke: (s: ReplyValue, id: bigint) =>
    take(
      () => api.memoryStroke(s.owner, s.session, s.scene, id),
      (v) => ({ code: v.code, count: v.count, color: [v.red, v.green, v.blue, v.opacity] }),
    ),
  page: (
    s: ReplyValue,
    id: bigint,
    revision: bigint,
    chunk: bigint,
    detail: number,
    cursor: bigint,
  ) =>
    take(
      () =>
        api.memoryGeometryPage(s.owner, s.session, s.scene, id, revision, chunk, detail, cursor),
      (v) => ({ code: v.code, page: v.page, next: v.next, done: v.done, data: v.capsules }),
    ),
  placement: (s: ReplyValue, id: bigint, page: bigint) =>
    take(
      () => api.memoryPlacement(s.owner, s.session, s.mapping, id, page),
      (v) => ({ code: v.code, available: v.available, matrix: v.matrix }),
    ),
  release: (s: ReplyValue, page: bigint) =>
    take(
      () => api.memoryReleasePage(s.owner, s.session, page),
      (v) => v.code,
    ),
};
