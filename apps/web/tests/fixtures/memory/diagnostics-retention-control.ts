import { PreparedCache } from "../../../src/memory/prepared-cache.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { retiringCpuResources } from "../../../src/memory/gpu-retirement.ts";
import { resourceSnapshot } from "../../../src/memory/resource-monitor.ts";
import { geometryMetrics } from "../../../src/memory/geometry-metrics.ts";
import { DisplayBase } from "../../../src/memory/display-base.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { diagnosticEventObservation } from "./diagnostics-event-observation.ts";
// Actual application owners only. One-shot faults are armed explicitly by the browser test.
let publications = 0,
  readinessValidations = 0,
  copybacks = 0,
  copybackPublications = 0;
let lastReadiness = "";
const publish = DisplayBase.prototype.publish;
DisplayBase.prototype.publish = function (...args) {
  const before = diagnosticEventObservation().publications;
  const result = publish.apply(this, args);
  if (args[2]) publications++;
  else {
    copybacks++;
    copybackPublications += diagnosticEventObservation().publications - before;
  }
  return result;
};
const ready = frames.ready;
frames.ready = (...args) => {
  const result = ready(...args);
  // Both codes validate the exact receipt; noop only means display_usable was already true.
  // This observes readiness validation, not memoryPresented or physical presentation.
  if (result.code === "ok" || result.code === "noop") {
    const key = `${result.session}:${result.content}:${result.mapping}:${args[1]}`;
    if (key !== lastReadiness) {
      lastReadiness = key;
      if (readinessValidations < Number.MAX_SAFE_INTEGER) readinessValidations++;
    }
  }
  return result;
};
document.addEventListener("fixture-retention-observe", () => {
  document.body.dataset.fixtureRetention = JSON.stringify({
    resources: resourceSnapshot(),
    retiring: retiringCpuResources(),
    geometry: geometryMetrics,
    publications,
    readinessValidations,
    copybacks,
    copybackPublications,
    diagnostic: diagnosticEventObservation(),
  });
});
document.addEventListener("fixture-retention-arm", (event) => {
  if (!(event instanceof CustomEvent)) return;
  const detail: unknown = event.detail;
  const mode = detail && typeof detail === "object" && "mode" in detail ? detail.mode : detail;
  const operation =
    detail &&
    typeof detail === "object" &&
    "operation" in detail &&
    typeof detail.operation === "string" &&
    /^[1-9][0-9]{0,19}$/.test(detail.operation)
      ? BigInt(detail.operation)
      : undefined;
  if (mode === "ticket") {
    const original = preparation.release;
    preparation.release = (state, token) => {
      if (operation !== undefined && token !== operation) return original(state, token);
      preparation.release = original;
      document.body.dataset.fixtureTicketFault = "invalid-once";
      document.body.dataset.fixtureTicketFaultOperation = token.toString();
      return "invalid";
    };
    window.addEventListener(
      "pagehide",
      () => {
        preparation.release = original;
      },
      { once: true },
    );
    return;
  }
  if (mode !== "hold" && mode !== "reject") return;
  const original = PreparedCache.prototype.dispose;
  PreparedCache.prototype.dispose = function () {
    PreparedCache.prototype.dispose = original;
    document.body.dataset.fixtureRetirementHeld = String(this.resources().bytes);
    return new Promise<void>((resolve, reject) => {
      const release = (signal?: Event) => {
        clearTimeout(timer);
        document.removeEventListener("fixture-retirement-release", release);
        window.removeEventListener("pagehide", release);
        document.body.dataset.fixtureRetirementReleased = signal?.type ?? "timeout";
        if (mode === "reject") {
          reject(Error("PRIVATE_CLEANUP_CANARY"));
          return;
        }
        try {
          original.call(this);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      const timer = setTimeout(release, 2000);
      document.addEventListener("fixture-retirement-release", release, { once: true });
      window.addEventListener("pagehide", release, { once: true });
    });
  };
});
