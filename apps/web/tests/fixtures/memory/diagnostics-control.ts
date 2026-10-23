import { diagnosticsStore } from "../../../src/developer-diagnostics/runtime-port.ts";
import type { DiagnosticEvent } from "../../../src/developer-diagnostics/schema.ts";
// Bounded adversarial metadata only. This module is absent from the production entry.
document.addEventListener("fixture-diagnostics", (event) => {
  if (!(event instanceof CustomEvent)) return;
  const action: unknown = event.detail;
  let reads = 0;
  const before = diagnosticsStore.state().baselineEvents;
  const observer = new MutationObserver(() => {});
  const panel = document.querySelector('[role="dialog"][aria-label="Developer diagnostics"]');
  if (panel)
    observer.observe(panel, {
      childList: true,
      attributes: true,
      characterData: true,
      subtree: true,
    });
  if (action === "changing-getter") {
    diagnosticsStore.record({
      get event() {
        reads++;
        return reads === 1 ? "frame.trace" : "command.result";
      },
      atMs: performance.now(),
      command: "append",
    });
  } else if (action === "privacy") {
    const record = {
      event: "command.result",
      atMs: performance.now(),
      command: "undo",
      outcome: "rejected",
      cause: "timeout",
      session: "18446744073709551615",
      revision: "9007199254740993",
      admissionRevision: "18446744073709551615",
      admissionScene: "9007199254740993",
      admissionMapping: "0",
      content: "PRIVATE_DRAWING_CANARY",
      path: "/PRIVATE_PATH_CANARY",
      message: "PRIVATE_ERROR_CANARY",
    } as const;
    diagnosticsStore.record(record);
  } else if (action === "invalid") {
    diagnosticsStore.record({ event: "command.result", atMs: -1, command: "undo" });
  } else if (action === "invalid-admission") {
    diagnosticsStore.record({
      event: "worker.admitted",
      atMs: performance.now(),
      admissionRevision: "18446744073709551616",
    });
  } else if (action === "invalid-cause") {
    const record: DiagnosticEvent = {
      event: "worker.rejected",
      atMs: performance.now(),
      cause: "timeout",
    };
    Object.defineProperty(record, "cause", { value: "PRIVATE_CAUSE_CANARY" });
    diagnosticsStore.record(record);
  } else if (action === "worker-detail") {
    diagnosticsStore.record({ event: "worker.admitted", atMs: performance.now(), request: "1" });
  } else if (action === "overflow") {
    for (let i = 0; i < 4100; i++)
      diagnosticsStore.record({
        event: "frame.trace",
        atMs: performance.now(),
        count: i,
      });
  } else if (action === "byte-overflow") {
    const id = "18446744073709551615";
    for (let i = 0; i < 4097; i++)
      diagnosticsStore.record({
        event: "frame.trace",
        atMs: performance.now(),
        command: "rotate.update",
        origin: "lifecycle",
        outcome: "completed",
        failure: "allocation",
        cause: "dispatch-unavailable",
        pointer: "mouse",
        session: id,
        interaction: id,
        request: id,
        operation: id,
        stroke: id,
        revision: id,
        scene: id,
        mapping: id,
        admissionRevision: id,
        admissionScene: id,
        admissionMapping: id,
        frame: id,
        generation: id,
        count: Number.MAX_SAFE_INTEGER,
        bytes: Number.MAX_SAFE_INTEGER,
        durationMs: Number.MAX_SAFE_INTEGER,
      });
  } else if (action === "sink") {
    diagnosticsStore.sinkFailure();
  } else if (action === "worker-sink") {
    const original = diagnosticsStore.record.bind(diagnosticsStore);
    diagnosticsStore.record = (record, detailed) => {
      if (record.event === "worker.started") {
        diagnosticsStore.record = original;
        document.body.dataset.fixtureWorkerSink = "failed-once";
        throw Error("PRIVATE_WORKER_SINK_CANARY");
      }
      original(record, detailed);
    };
  } else if (action === "throwing-getter") {
    const record: DiagnosticEvent = {
      get event(): "command.result" {
        throw Error("PRIVATE_GETTER_CANARY");
      },
      atMs: 0,
    };
    diagnosticsStore.record(record);
  }
  const state = diagnosticsStore.state();
  const synchronousChanges = observer.takeRecords().length;
  observer.disconnect();
  document.body.dataset.fixtureDiagnosticState = JSON.stringify({
    before,
    synchronousChanges,
    baseline: state.baselineEvents,
    reads,
    capturing: state.capturing,
    dropped: state.dropped,
    sinkFailures: state.sinkFailures,
    reason: state.report?.reason,
    events: state.report?.records.length,
    bytes: state.report?.logicalBytesUpperBound,
  });
});
