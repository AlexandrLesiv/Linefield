import { callbackDuration, metricsWanted } from "./runtime-metrics.ts";
import { withIntent } from "./intent.ts";
import { diagnosticsStore } from "./runtime-port.ts";
import { observeInputCallback } from "./callback-observation.ts";
export function observePointer(action: (event: PointerEvent) => void) {
  return (event: PointerEvent) => {
    const actionWithOrigin = () => {
      const pointer =
        event.pointerType === "pen" ? "pen" : event.pointerType === "mouse" ? "mouse" : "none";
      return withIntent("pointer", () => action(event), pointer);
    };
    if (!metricsWanted()) return actionWithOrigin();
    const start = performance.now();
    return observeInputCallback(actionWithOrigin, (observed) => {
      try {
        if (observed) callbackDuration(start);
      } catch {
        diagnosticsStore.sinkFailure();
      }
    });
  };
}
export function observeWheel(action: (event: WheelEvent) => void) {
  return (event: WheelEvent) => withIntent("pointer", () => action(event), "none");
}
