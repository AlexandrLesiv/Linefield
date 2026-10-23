import * as evidence from "../memory/performance-observation.ts";
import type { ReplyValue } from "../memory/bridge.ts";
import { diagnosticsStore, identity, isCurrent } from "./runtime-port.ts";
import { metricsWanted, renderMetric, sourceMetric } from "./runtime-metrics.ts";
let lastSubmission = "";
let lastPublication = "";
export function submitted(state: ReplyValue, epoch: number, serial: number, complete: boolean) {
  evidence.submissionObservation(state, epoch, serial, complete);
  if (!metricsWanted() && !diagnosticsStore.capturing) return;
  try {
    const key = `${state.session}:${epoch}:${serial}`;
    if (key === lastSubmission) return;
    lastSubmission = key;
    renderMetric("submitted");
    if (diagnosticsStore.capturing)
      diagnosticsStore.record(
        {
          event: "frame.trace",
          atMs: performance.now(),
          origin: "renderer",
          ...identity(state),
          generation: String(epoch),
          frame: String(serial),
          outcome: complete ? "completed" : "accepted",
        },
        true,
      );
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
export function validated(state: ReplyValue, epoch: number, receipt: bigint, serial: number) {
  evidence.acknowledgementObservation(state, epoch, receipt, serial);
  try {
    const key = `${state.session}:${state.content}:${state.mapping}:${epoch}:${receipt}`;
    if (key === lastPublication || !isCurrent(state)) return;
    lastPublication = key;
    renderMetric("validated");
    sourceMetric("current");
    diagnosticsStore.record({
      event: "frame.published",
      atMs: performance.now(),
      origin: "renderer",
      ...identity(state),
      operation: receipt.toString(10),
      generation: String(epoch),
      frame: String(serial),
      outcome: "completed",
    });
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
