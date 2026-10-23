import { tailComposite } from "./tail-composite.ts";
import { gpuWakeActions } from "./gpu-wake-actions.ts";
import { seedActions } from "./seed-actions.ts";
import { viewActions } from "./view-actions.ts";
import { retentionPressure } from "./retention-pressure.ts";
import { retentionGpu } from "./retention-gpu.ts";
import { retentionLifetime } from "./retention-lifetime.ts";
import { retentionCleanup } from "./retention-cleanup.ts";
import { retentionCandidateRejection } from "./retention-candidate-rejection.ts";
import { retentionRelease } from "./retention-release.ts";
import { retentionStoredCleanup } from "./retention-stored-cleanup.ts";
import { queryLatch } from "./query-latch.ts";
import { queryValidity } from "./query-validity.ts";
import { visibilityPressure } from "./visibility-pressure.ts";
import { visibilityLifetime } from "./visibility-lifetime.ts";
import { visibilityYield } from "./visibility-yield.ts";
import { visibilityNumerics } from "./visibility-numerics.ts";
import { visibilityGetters } from "./visibility-getters.ts";
import { visibilityPins } from "./visibility-pins.ts";
import { visibilityComposite } from "./visibility-composite.ts";
import { coverageBoundary } from "./current-coverage.ts";
import { coverageLifetime } from "./coverage-lifetime.ts";
import { tailCapacity } from "./tail-capacity.ts";
import { candidateFailure } from "./candidate-failure.ts";
import { gpuNumerics } from "./gpu-numerics.ts";
import { livePrefixBoundary } from "./live-prefix.ts";
import { tailBoundary } from "./tail-boundary.ts";
import { historyDisplayBoundary } from "./history-display.ts";
import { pageJoins } from "./page-joins.ts";
import { gpuEdges } from "./gpu-edges.ts";
import { gpuTaper } from "./gpu-taper.ts";
import { terminalReserve } from "./gpu-terminal.ts";
import { gpuContract } from "./gpu-contract.ts";
import { loadRenderer } from "./renderer.ts";
import { cleanupFailure } from "./cleanup.ts";
import { loadEngine } from "../../../src/memory/loader.ts";
import { boundaryMatrix } from "./boundary.ts";
import { calibration } from "./calibration.ts";
import { resourceLifetimes } from "./lifetimes.ts";
import { diagnosticSnapshot } from "../../../src/memory/diagnostics.ts";
const output = document.querySelector("#result");
const actions = document.querySelector("#actions");
const canvas = document.querySelector("canvas");
if (!(output instanceof HTMLElement) || !(actions instanceof HTMLElement) || !canvas)
  throw Error("fixture document");
function action(name: string, run: () => Promise<unknown>): void {
  const button = document.createElement("button");
  button.textContent = name;
  button.addEventListener("click", () => {
    actions!.querySelectorAll("button").forEach((control) => {
      control.disabled = true;
    });
    output!.textContent = "running";
    void run()
      .then((value) => {
        output!.textContent = JSON.stringify({
          status: "passed",
          result: value,
          diagnostics: diagnosticSnapshot(),
        });
      })
      .catch((error: unknown) => {
        output!.textContent = JSON.stringify({
          status: "failed",
          reason: error instanceof Error ? error.message : "fixture failure",
        });
      });
  });
  actions!.append(button);
}
gpuWakeActions(action, canvas);
seedActions(action, canvas);
viewActions(action, canvas);
action("Run boundary matrix", async () => {
  await loadEngine();
  return boundaryMatrix();
});
for (const [name, run] of [
  ["CPU pressure", retentionPressure],
  ["GPU pressure", () => retentionGpu(canvas)],
  ["GPU count", () => retentionGpu(canvas, true)],
  ["cleanup", () => retentionCleanup(canvas)],
  ["candidate rejected", () => retentionCandidateRejection(canvas)],
  ["candidate receipt rejected", () => retentionCandidateRejection(canvas, "receipt")],
  ["candidate residency rejected", () => retentionCandidateRejection(canvas, "residency")],
  ["candidate operation rejected", () => retentionCandidateRejection(canvas, "operation-receipt")],
  [
    "candidate notification rejected",
    () => retentionCandidateRejection(canvas, "commands-notification"),
  ],
  ["stored cleanup rejected", () => retentionStoredCleanup(canvas)],
  ["page release", () => retentionRelease(canvas, "page")],
  ["ticket release", () => retentionRelease(canvas, "ticket")],
  ["ticket code", () => retentionRelease(canvas, "code")],
  ["CPU lifetime", () => retentionLifetime(canvas, false, false)],
  ["CPU rejected", () => retentionLifetime(canvas, true, false)],
  ["CPU context lost", () => retentionLifetime(canvas, false, true)],
] satisfies [string, () => Promise<unknown>][])
  action(`Run retention ${name}`, async () => {
    await loadEngine();
    return run();
  });
action("Run query latch", async () => {
  await loadEngine();
  return queryLatch();
});
action("Run query validity", async () => {
  await loadEngine();
  return queryValidity();
});
action("Run visibility pressure", async () => {
  await loadEngine();
  return visibilityPressure();
});
action("Run visibility lifetime", async () => {
  await loadEngine();
  return visibilityLifetime();
});
action("Run visibility cold yield", async () => {
  await loadEngine();
  return visibilityYield(canvas);
});
action("Run visibility numerics", async () => {
  await loadEngine();
  return visibilityNumerics();
});
action("Run visibility getters", async () => {
  await loadEngine();
  return visibilityGetters();
});
action("Run visibility pins", async () => {
  await loadEngine();
  return visibilityPins();
});
action("Run visibility composite", async () => {
  await loadEngine();
  return visibilityComposite(canvas);
});
action("Run resource lifetimes", async () => {
  await loadEngine();
  return resourceLifetimes(await loadRenderer(), canvas);
});
action("Run bounded calibration", async () => calibration(await loadRenderer(), canvas));

action("Run cleanup failure", async () => cleanupFailure(await loadRenderer(), canvas));

action("Run GPU contract", async () => {
  await loadEngine();
  return gpuContract();
});

action("Run terminal reserve", async () => {
  await loadEngine();
  return terminalReserve();
});

action("Run GPU numerics", async () => {
  await loadEngine();
  return gpuNumerics();
});
action("Run page joins", async () => {
  await loadEngine();
  return pageJoins();
});
action("Run GPU edges", async () => {
  await loadEngine();
  return gpuEdges(canvas);
});
action("Run GPU taper", async () => gpuTaper(canvas));
action("Run historical display boundary", async () => {
  await loadEngine();
  return historyDisplayBoundary();
});
action("Run live prefix boundary", async () => {
  await loadEngine();
  return livePrefixBoundary();
});
action("Run captured tail boundary", async () => {
  await loadEngine();
  return tailBoundary();
});

action("Run tail composite", async () => tailComposite(canvas));
action("Run current coverage", async () => {
  await loadEngine();
  return coverageBoundary();
});
action("Run coverage lifetime", async () => {
  await loadEngine();
  return coverageLifetime();
});
action("Run tail capacity", async () => {
  await loadEngine();
  return tailCapacity(canvas);
});
for (const afterIssue of [false, true])
  action(`Run candidate failure ${afterIssue ? "after" : "before"} composite`, async () => {
    await loadEngine();
    return candidateFailure(canvas, afterIssue);
  });
