import * as api from "#memory-bindings";
import { consume, reply } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export interface InputBatch {
  x: Float64Array;
  y: Float64Array;
  pressure: Float64Array;
  hasPressure: Uint8Array;
}
export const penBridge = {
  settings: (state: ReplyValue, width: number, red: number, green: number, blue: number) =>
    consume(
      "settings",
      () => api.memorySettings(state.owner, state.session, width, red, green, blue),
      reply,
    ),
  undo: (state: ReplyValue) =>
    consume("undo", () => api.memoryUndo(state.owner, state.session), reply),
  redo: (state: ReplyValue) =>
    consume("redo", () => api.memoryRedo(state.owner, state.session), reply),
  begin: (
    state: ReplyValue,
    pointer: number,
    x: number,
    y: number,
    pressure: number,
    hasPressure: boolean,
  ) =>
    consume(
      "begin",
      () =>
        api.memoryBegin(
          state.owner,
          state.session,
          state.mapping,
          pointer,
          x,
          y,
          pressure,
          hasPressure,
        ),
      reply,
    ),
  append: (state: ReplyValue, first: bigint, batch: InputBatch) =>
    consume(
      "append",
      () =>
        api.memoryAppend(
          state.owner,
          state.session,
          state.interaction,
          state.mapping,
          first,
          batch.x,
          batch.y,
          batch.pressure,
          batch.hasPressure,
        ),
      reply,
    ),
  end: (state: ReplyValue, next: bigint) =>
    consume(
      "end",
      () => api.memoryEnd(state.owner, state.session, state.interaction, state.mapping, next),
      reply,
    ),
  cancel: (
    state: ReplyValue,
    cause: "escape" | "blur" | "pointer-cancel" | "capture-loss" | "queue-overflow",
  ) =>
    consume(
      "cancel",
      () => api.memoryCancel(state.owner, state.session, state.interaction, cause),
      reply,
    ),
  stroke: (state: ReplyValue, stroke: bigint) =>
    consume(
      "stroke-state",
      () => api.memoryStrokeState(state.owner, state.session, state.scene, stroke),
      (value) => ({
        ...reply(value),
        geometry: value.geometry,
        verbs: value.verbs,
        terminal: value.terminal,
      }),
    ),
  page: (state: ReplyValue, stroke: bigint, geometry: bigint, offset: bigint) =>
    consume(
      "scene-page",
      () => api.memoryScene(state.owner, state.session, state.scene, stroke, geometry, offset),
      (value) => ({
        ...reply(value),
        geometry: value.geometry,
        next: value.next,
        done: value.done,
        stroke: value.stroke,
        red: value.red,
        green: value.green,
        blue: value.blue,
        verbs: value.verbs,
        points: value.points,
        weights: value.weights,
      }),
    ),
};
