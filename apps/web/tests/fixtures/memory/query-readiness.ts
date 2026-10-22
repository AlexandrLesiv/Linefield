import { frames } from "../../../src/memory/frame-bridge.ts";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
// Numerical/boundary experiments explicitly simulate host display validation.
// This helper is not GPU readiness or actual-route input acceptance evidence.
export function queryReady(state: ReplyValue): ReplyValue {
  const receipt = frames.capture(state);
  if (receipt.code !== "ok") throw Error(`fixture capture ${receipt.code}`);
  try {
    const ready = frames.ready(state, receipt.id);
    if (ready.code !== "ok" && ready.code !== "noop") throw Error(`fixture ready ${ready.code}`);
    return ready;
  } finally {
    frames.release(state, receipt.id);
  }
}
