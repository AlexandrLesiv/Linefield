import * as api from "#memory-bindings";
import { consume, reply } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
function copy(value: api.RenderTarget) {
  return {
    ...reply(value),
    target: value.target,
    backing: value.backing,
    canAdopt: value.canAdopt,
    sourceMapping: value.sourceMapping,
    outside: value.outside,
    affine: [value.m11, value.m12, value.m21, value.m22, value.offsetX, value.offsetY],
  };
}
export const targetBridge = {
  capture: (s: ReplyValue) =>
    consume("render-capture", () => api.memoryRenderCapture(s.owner, s.session, s.mapping), copy),
  transform: (s: ReplyValue, t: bigint) =>
    consume(
      "render-transform",
      () => api.memoryRenderTransform(s.owner, s.session, t, s.mapping),
      copy,
    ),
  adopt: (s: ReplyValue, t: bigint) =>
    consume(
      "render-adopt",
      () => api.memoryRenderAdopt(s.owner, s.session, t, s.mapping, s.presentation),
      reply,
    ),
  release: (s: ReplyValue, t: bigint) =>
    consume("render-release", () => api.memoryRenderRelease(s.owner, s.session, t), reply),
  ids: (s: ReplyValue, t: bigint, after: bigint) =>
    consume(
      "render-ids",
      () => api.memoryRenderIds(s.owner, s.session, t, after),
      (v) => ({ ...reply(v), ids: v.ids, done: v.done }),
    ),
  stroke: (s: ReplyValue, t: bigint, id: bigint) =>
    consume(
      "render-stroke",
      () => api.memoryRenderStroke(s.owner, s.session, t, id),
      (v) => ({ ...reply(v), geometry: v.geometry, verbs: v.verbs, terminal: v.terminal }),
    ),
  page: (s: ReplyValue, t: bigint, id: bigint, g: bigint, o: bigint) =>
    consume(
      "render-page",
      () => api.memoryRenderPage(s.owner, s.session, t, id, g, o),
      (v) => ({
        ...reply(v),
        geometry: v.geometry,
        next: v.next,
        done: v.done,
        stroke: v.stroke,
        red: v.red,
        green: v.green,
        blue: v.blue,
        verbs: v.verbs,
        points: v.points,
        weights: v.weights,
      }),
    ),
};
