import type { ReplyValue } from "./bridge.ts";
import { commandPhaseObservation } from "./performance-observation.ts";

export type CommandTiming = {
  callbackStart: number;
  acquisitionEnd: number;
  rustReturn: number;
  stateUpdateEnd: number;
  controlsSyncEnd: number;
  contactSyncEnd: number;
};
export function startCommandTiming(): CommandTiming | undefined {
  if (import.meta.env.MODE !== "performance-e2e") return undefined;
  const start = performance.now();
  return {
    callbackStart: start,
    acquisitionEnd: start,
    rustReturn: start,
    stateUpdateEnd: start,
    controlsSyncEnd: start,
    contactSyncEnd: start,
  };
}
export function runObservedCommand(
  action: () => ReplyValue,
  accept: (s: ReplyValue) => boolean,
  controls: () => void,
  contact: () => void,
  schedule: () => void,
  supplied?: CommandTiming,
) {
  const timing = supplied ?? startCommandTiming();
  const result = action();
  if (timing) timing.rustReturn = performance.now();
  accept(result);
  if (timing) timing.stateUpdateEnd = performance.now();
  controls();
  if (timing) timing.controlsSyncEnd = performance.now();
  contact();
  if (timing) timing.contactSyncEnd = performance.now();
  schedule();
  if (timing && !supplied) commandPhaseObservation(result, timing);
  return result;
}
