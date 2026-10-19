import type { ReplyValue } from "./bridge.ts";
interface InputRecord {
  owner: string;
  session: string;
  interaction: string;
  content: string;
  activeCancelled: boolean;
  source: string;
  reason: string;
  outcome: string;
  acceptedSamples: string;
  maxCoalesced: number;
  time: number;
}
const records: InputRecord[] = [];
const reasons = new Set([
  "begin",
  "end",
  "append",
  "escape",
  "canvas-blur",
  "window-blur",
  "hidden",
  "pointer-cancel",
  "capture-loss",
  "queue-overflow",
  "shared-cancel",
  "release-pending",
  "fresh-contact",
  "pressed-move",
]);
const outcomes = new Set([
  "ok",
  "noop",
  "invalid",
  "capacity",
  "coordinate-overflow",
  "numerical-capacity",
  "stale-interaction",
  "stale-owner",
  "stale-session",
  "stale-mapping",
  "stale-scene",
  "sequence",
  "active",
  "unavailable",
  "disposed",
  "exhausted",
  "host-unavailable",
]);
let dropped = 0;
export function inputDiagnostic(
  state: ReplyValue,
  source: string,
  reason: string,
  outcome: string,
  acceptedSamples: bigint,
  maxCoalesced: number,
  final: ReplyValue = state,
) {
  if (!["mouse", "pen"].includes(source) || !reasons.has(reason) || !outcomes.has(outcome)) return;
  if (acceptedSamples < 0n || !Number.isSafeInteger(maxCoalesced) || maxCoalesced < 0) return;
  if (
    [state.owner, state.session, state.interaction, final.content, acceptedSamples].some(
      (value) => value < 0n || value > 18446744073709551615n,
    )
  )
    return;
  if (records.length === 100) {
    records.shift();
    dropped += 1;
  }
  records.push({
    owner: state.owner.toString(),
    session: state.session.toString(),
    interaction: state.interaction.toString(),
    content: final.content.toString(),
    activeCancelled: final.activeCancelled,
    source,
    reason,
    outcome,
    acceptedSamples: acceptedSamples.toString(),
    maxCoalesced,
    time: Math.round(performance.now()),
  });
}
export function inputDiagnostics() {
  return { records: records.map((record) => ({ ...record })), dropped };
}
