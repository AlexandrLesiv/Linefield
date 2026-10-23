import "../../../src/main.ts";
import "./diagnostics-control.ts";
import "./diagnostics-job-hold.ts";
import "./diagnostics-retention-control.ts";
import * as api from "#memory-bindings";
import { loadEngine } from "../../../src/memory/loader.ts";
import { diagnosticSnapshot } from "../../../src/memory/diagnostics.ts";
const arm = document.querySelector("#arm");
if (!(arm instanceof HTMLButtonElement)) throw Error("isolated control absent");
arm.addEventListener("click", () => {
  arm.disabled = true;
  void loadEngine().then(() => {
    const fail: unknown = Reflect.get(api, "fixtureFailNextMetrics");
    if (typeof fail !== "function") throw Error("fixture feature absent");
    fail();
    arm.hidden = true;
  });
});
// Observation-only fixture event. Never included in production application entry.
document.addEventListener("fixture-observe", () => {
  document.body.dataset.fixtureDiagnostics = JSON.stringify(diagnosticSnapshot());
});
