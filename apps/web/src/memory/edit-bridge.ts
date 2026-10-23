import { inputObservation } from "./performance-observation.ts";
import { editorSnapshot } from "./editor-health.ts";
import { diagnostic } from "./diagnostics.ts";
import * as api from "#memory-bindings";
import type { Reply } from "#memory-bindings";
import type { ReplyValue } from "./bridge.ts";
import { observeReply } from "../developer-diagnostics/runtime-port.ts";
export function take<T extends Reply, R>(action: () => T, copy: (value: T) => R): R {
  return editorSnapshot(action, copy);
}
export const copyReply = (v: Reply): ReplyValue => ({
  code: v.code,
  owner: v.owner,
  session: v.session,
  interaction: v.interaction,
  content: v.content,
  scene: v.scene,
  mapping: v.mapping,
  presentation: v.presentation,
  activeCancelled: v.activeCancelled,
});
const command = (action: () => Reply, name = "", observation = name) => {
  const result = take(action, copyReply);
  inputObservation(result, name || "update");
  observeReply(observation, result);
  if (name) diagnostic(name, result.code, result.session);
  return result;
};
export const edit = {
  resetView: (s: ReplyValue) =>
    command(() => api.memoryResetView(s.owner, s.session, s.mapping), "", "view"),
  style: (s: ReplyValue, width: number, color: readonly number[]) =>
    command(
      () => api.memoryStyle(s.owner, s.session, width, color[0] ?? 0, color[1] ?? 0, color[2] ?? 0),
      "",
      "style",
    ),
  begin: (
    s: ReplyValue,
    pointer: number,
    x: number,
    y: number,
    pressure: number,
    present: boolean,
  ) =>
    command(
      () => api.memoryBegin(s.owner, s.session, s.mapping, pointer, x, y, pressure, present),
      "begin",
    ),
  append: (
    s: ReplyValue,
    index: bigint,
    x: Float64Array,
    y: Float64Array,
    p: Float64Array,
    flags: Uint8Array,
  ) =>
    command(
      () => api.memoryAppend(s.owner, s.session, s.interaction, s.mapping, index, x, y, p, flags),
      "",
      "append",
    ),
  end: (s: ReplyValue, next: bigint) =>
    command(() => api.memoryEnd(s.owner, s.session, s.interaction, s.mapping, next), "end"),
  cancel: (s: ReplyValue, cause: Parameters<typeof api.memoryCancel>[3]) =>
    command(() => api.memoryCancel(s.owner, s.session, s.interaction, cause), "cancel"),
  undo: (s: ReplyValue, redo = false) =>
    command(
      () => (redo ? api.memoryRedo(s.owner, s.session) : api.memoryUndo(s.owner, s.session)),
      redo ? "redo" : "undo",
    ),
  panBegin: (s: ReplyValue, pointer: number, x: number, y: number, rotate: boolean) =>
    command(
      () =>
        (rotate ? api.memoryRotateBegin : api.memoryPanBegin)(
          s.owner,
          s.session,
          s.mapping,
          pointer,
          x,
          y,
        ),
      "begin",
      rotate ? "rotate.begin" : "pan.begin",
    ),
  panUpdate: (
    s: ReplyValue,
    sequence: bigint,
    x: number,
    y: number,
    snap: boolean,
    rotate = false,
  ) =>
    command(
      () => api.memoryPanUpdate(s.owner, s.session, s.interaction, s.mapping, sequence, x, y, snap),
      "",
      rotate ? "rotate.update" : "pan.update",
    ),
  panEnd: (s: ReplyValue, sequence: bigint, rotate = false) =>
    command(
      () => api.memoryPanEnd(s.owner, s.session, s.interaction, s.mapping, sequence),
      "end",
      rotate ? "rotate.end" : "pan.end",
    ),
  view: (s: ReplyValue, value: number, x: number, y: number, rotate: boolean, snap = false) =>
    command(
      () =>
        rotate
          ? api.memoryRotateAt(s.owner, s.session, s.mapping, value, x, y, snap)
          : api.memoryZoomAt(s.owner, s.session, s.mapping, value, x, y),
      "",
      "view",
    ),
};
