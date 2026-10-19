import { cleanupFailure } from "./cleanup.ts";
import { loadEngine, loadRenderer } from "../../src/memory/loader.ts";
import { boundaryMatrix } from "./boundary.ts";
import { calibration } from "./calibration.ts";
import { resourceLifetimes } from "./lifetimes.ts";
import { diagnosticSnapshot } from "../../src/memory/diagnostics.ts";
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
action("Run boundary matrix", async () => {
  await loadEngine();
  return boundaryMatrix();
});
action("Run resource lifetimes", async () => {
  await loadEngine();
  return resourceLifetimes(await loadRenderer(), canvas);
});
action("Run bounded calibration", async () => calibration(await loadRenderer(), canvas));

action("Run cleanup failure", async () => cleanupFailure(await loadRenderer(), canvas));
