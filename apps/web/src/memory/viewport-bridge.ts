import * as api from "#memory-bindings";
import { consume, reply } from "./bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export type PanDirection = "left" | "right" | "up" | "down";
export const viewportBridge = {
  rotate: (v: ReplyValue, direction: "left" | "right" | "reset") =>
    consume(
      "rotate-step",
      () => api.memoryRotateStep(v.owner, v.session, v.mapping, direction),
      reply,
    ),
  begin: (v: ReplyValue, pointer: number, x: number, y: number) =>
    consume(
      "pan-begin",
      () => api.memoryPanBegin(v.owner, v.session, v.mapping, pointer, x, y),
      reply,
    ),
  update: (v: ReplyValue, sequence: bigint, x: number, y: number) =>
    consume(
      "pan-update",
      () => api.memoryPanUpdate(v.owner, v.session, v.interaction, v.mapping, sequence, x, y),
      reply,
    ),
  end: (v: ReplyValue, next: bigint) =>
    consume(
      "pan-end",
      () => api.memoryPanEnd(v.owner, v.session, v.interaction, v.mapping, next),
      reply,
    ),
  step: (v: ReplyValue, direction: PanDirection) =>
    consume("pan-step", () => api.memoryPanStep(v.owner, v.session, v.mapping, direction), reply),
  zoom: (v: ReplyValue, direction: "in" | "out") =>
    consume("zoom-step", () => api.memoryZoomStep(v.owner, v.session, v.mapping, direction), reply),
};
