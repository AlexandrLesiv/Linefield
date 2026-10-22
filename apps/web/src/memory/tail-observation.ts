import { append } from "./performance-observation.ts";
import type { ReplyValue } from "./bridge.ts";
export function tailObservation(
  s: ReplyValue,
  phase: string,
  stroke: bigint,
  count: bigint,
  through: bigint,
  exact: boolean,
) {
  if (import.meta.env.MODE === "performance-e2e")
    append({
      kind: "live-tail",
      phase,
      owner: `${s.owner}`,
      session: `${s.session}`,
      scene: `${s.scene}`,
      mapping: `${s.mapping}`,
      interaction: `${s.interaction}`,
      stroke: `${stroke}`,
      count: `${count}`,
      through: `${through}`,
      exact,
      time: performance.now(),
    });
}
