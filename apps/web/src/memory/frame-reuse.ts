import * as api from "#memory-bindings";
import { take } from "./edit-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export function frameReuse(s: ReplyValue, source: bigint, target: bigint) {
  return take(
    () => api.memoryFrameReuse(s.owner, s.session, s.mapping, source, target),
    (v) => ({
      code: v.code,
      reusable: v.reusable,
      missReason: v.missReason,
      sourceCount: v.sourceCount,
      sourceThrough: v.sourceThrough,
      targetCount: v.targetCount,
      targetThrough: v.targetThrough,
    }),
  );
}
