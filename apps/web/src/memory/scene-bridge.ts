import * as api from "#memory-bindings";
import { editorHealthy } from "./editor-health.ts";
import type { ReplyValue } from "./bridge.ts";
import { take } from "./edit-bridge.ts";
import { strokeCountObservation } from "./performance-observation.ts";
export const scene = {
  ids: (s: ReplyValue, after: bigint) =>
    take(
      () => api.memorySceneIds(s.owner, s.session, s.scene, after),
      (v) => ({ code: v.code, done: v.done, ids: v.ids }),
    ),
  stroke: (s: ReplyValue, id: bigint) => {
    const value = take(
      () => api.memoryStroke(s.owner, s.session, s.scene, id),
      (v) => ({
        code: v.code,
        count: v.count,
        active: v.active,
        color: [v.red, v.green, v.blue, v.opacity],
      }),
    );
    if (value.code === "ok") strokeCountObservation(s, id, value.count, value.active);
    return value;
  },
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
    editorHealthy()
      ? take(
          () => api.memoryReleasePage(s.owner, s.session, page),
          (v) => v.code,
        )
      : "disposed",
};
