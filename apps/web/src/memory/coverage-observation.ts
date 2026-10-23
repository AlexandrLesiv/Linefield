import { append } from "./performance-observation.ts";
import type { ReplyValue } from "./bridge.ts";
export function coverageObservation(
  s: ReplyValue,
  phase:
    | "seal"
    | "consume"
    | "view-consume"
    | "copyback"
    | "extension-retain"
    | "extension-discard",
  receipt: bigint,
) {
  if (import.meta.env.MODE === "performance-e2e")
    append({
      kind: "coverage-transition",
      phase,
      receipt: `${receipt}`,
      owner: `${s.owner}`,
      session: `${s.session}`,
      mapping: `${s.mapping}`,
      content: `${s.content}`,
      scene: `${s.scene}`,
      time: performance.now(),
    });
}
