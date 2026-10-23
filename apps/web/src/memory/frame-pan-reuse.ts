import * as api from "#memory-bindings";
import { take } from "./edit-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export function framePanReuse(s: ReplyValue, source: bigint, target: bigint) {
  return take(
    () => api.memoryFramePanReuse(s.owner, s.session, s.mapping, source, target),
    (v) => ({
      code: v.code,
      reusable: v.reusable,
      miss: v.missReason,
      sourceCount: v.sourceCount,
      sourceThrough: v.sourceThrough,
      targetCount: v.targetCount,
      targetThrough: v.targetThrough,
      epoch: v.epoch,
      shift: [v.shiftX, v.shiftY] as const,
    }),
  );
}
