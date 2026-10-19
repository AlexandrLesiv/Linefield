import { penCheckpoint } from "./pen-checkpoint.ts";
import { undoCheckpoint } from "./undo-checkpoint.ts";
import { workerCheckpoint } from "./worker-checkpoint.ts";
import { workerBaseline } from "./worker-baseline.ts";
import { renderTargetBoundary } from "./render-target.ts";
import { renderTargetFailure } from "./render-target-failure.ts";
import { rotationBoundary } from "./rotation.ts";
import { viewportBoundary } from "./viewport.ts";
import { cleanupFailure } from "./cleanup.ts";
import { loadEngine, loadRenderer } from "../../../src/memory/loader.ts";
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
        output!.textContent = JSON.stringify(
          {
            status: "passed",
            result: value,
            diagnostics: diagnosticSnapshot(),
          },
          (_key, entry: unknown) => (typeof entry === "bigint" ? String(entry) : entry),
        );
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
action("Run boundary matrix", async () => {
  await loadEngine();
  return boundaryMatrix();
});
action("Run render target boundary", async () => {
  await loadEngine();
  return renderTargetBoundary();
});
action("Run render target failure", async () => renderTargetFailure(await loadRenderer(), canvas));
action("Run rotation boundary", async () => {
  await loadEngine();
  return rotationBoundary();
});
action("Run viewport boundary", async () => {
  await loadEngine();
  return viewportBoundary();
});
action("Run resource lifetimes", async () => {
  await loadEngine();
  return resourceLifetimes(await loadRenderer(), canvas);
});
action("Run bounded calibration", async () => calibration(await loadRenderer(), canvas));

action("Run cleanup failure", async () => cleanupFailure(await loadRenderer(), canvas));

action("Run real pen checkpoint", async () => {
  await loadEngine();
  return penCheckpoint(await loadRenderer(), canvas);
});
action("Run Undo rendering checkpoint", async () => {
  await loadEngine();
  return undoCheckpoint(await loadRenderer(), canvas);
});
action("Run worker reference", async () => {
  await loadEngine();
  return workerBaseline(await loadRenderer(), canvas);
});
action("Run worker feasibility", async () => {
  await loadEngine();
  return workerCheckpoint(canvas);
});
