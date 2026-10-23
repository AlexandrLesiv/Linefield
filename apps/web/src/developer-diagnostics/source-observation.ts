import type { ReplyValue } from "../memory/bridge.ts";
import type { Coverage } from "../memory/current-coverage.ts";
import { diagnosticsStore, identity, isCurrent } from "./runtime-port.ts";
import { diagnosticIdentity } from "./schema.ts";
let previous = "";
/** Supplied normal-render scalars only: no queries and no inferred End-to-source join. */
export function observeCoverage(state: ReplyValue, coverage: Coverage): Coverage {
  if (!diagnosticsStore.capturing) {
    previous = "";
    return coverage;
  }
  try {
    if (!isCurrent(state) || !state.interaction || !coverage.activeSource) return coverage;
    const key = `${state.session}:${state.interaction}:${coverage.activeSource}:${coverage.activeCount}`;
    if (key === previous) return coverage;
    previous = key;
    const stroke = diagnosticIdentity(coverage.activeSource);
    if (stroke === undefined) return coverage;
    diagnosticsStore.record(
      {
        event: "frame.trace",
        atMs: performance.now(),
        origin: "renderer",
        outcome: "accepted",
        ...identity(state),
        stroke,
        ...(coverage.activeCount <= BigInt(Number.MAX_SAFE_INTEGER)
          ? { count: Number(coverage.activeCount) }
          : {}),
      },
      true,
    );
  } catch {
    diagnosticsStore.sinkFailure();
  }
  return coverage;
}
