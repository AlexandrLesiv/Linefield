import type { ReplyValue } from "../memory/bridge.ts";
import { diagnosticsStore, isCurrent } from "./runtime-port.ts";
import { diagnosticIdentity } from "./schema.ts";
// A provisional display union is not frame.published and cannot acknowledge readiness.
// One event per consumed candidate; the existing capture ring owns all bounds/drops.
export function composed(state: ReplyValue, anchor: bigint, candidate: bigint) {
  if (!diagnosticsStore.capturing) return;
  try {
    if (!isCurrent(state)) return;
    const owner = diagnosticIdentity(state.owner),
      session = diagnosticIdentity(state.session),
      mapping = diagnosticIdentity(state.mapping),
      operation = diagnosticIdentity(anchor),
      frame = diagnosticIdentity(candidate);
    if (
      owner === undefined ||
      session === undefined ||
      mapping === undefined ||
      operation === undefined ||
      frame === undefined
    )
      return;
    diagnosticsStore.record(
      {
        event: "frame.composed",
        atMs: performance.now(),
        origin: "renderer",
        outcome: "accepted",
        owner,
        session,
        mapping,
        operation,
        frame,
      },
      true,
    );
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
