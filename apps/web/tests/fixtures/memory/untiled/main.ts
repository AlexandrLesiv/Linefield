import { loadEngine } from "../../../../src/memory/loader.ts";
import { cases, sizes } from "../padded/catalogue.ts";
import { hostUnits } from "./telemetry.ts";
import { Harness } from "./harness.ts";
import { correctness } from "./correctness.ts";
import { lifecycle } from "./lifecycle.ts";
import { performanceCase } from "./performance.ts";
import { shapes } from "./catalogue.ts";
const button = document.querySelector("button");
const output = document.querySelector("#result");
if (!button || !output) throw Error("fixture-markup");
button.addEventListener("click", () => {
  button.disabled = true;
  void run();
});
async function run() {
  let harness: Harness | undefined;
  try {
    const engine = await loadEngine();
    const query = new URLSearchParams(location.search);
    const size = sizes.find((value) => value.id === query.get("size"));
    if (!size) throw Error("fixture-size");
    harness = new Harness(size.width, size.height);
    const lane = query.get("lane");
    let details: unknown;
    if (lane === "correctness") {
      const item = cases.find((value) => value.id === query.get("case"));
      if (!item) throw Error("fixture-case");
      details = await correctness(item, size.width, size.height, harness);
    } else if (lane === "lifecycle") details = await lifecycle(harness);
    else if (lane === "performance") {
      const shape = shapes.find((value) => value === query.get("case"));
      if (!shape) throw Error("fixture-shape");
      details = await performanceCase(shape, harness);
    } else throw Error("fixture-lane");
    output!.textContent = JSON.stringify({
      status: "completed",
      lane,
      size,
      details,
      rows: harness.rows,
      hostUnits,
      rustHeapCapacity: engine.bytes(),
      gate3: "not implemented/not run",
      scope: "isolated browser-hosted synthetic checkpoint; not physical input latency",
    });
  } catch (error: unknown) {
    output!.textContent = JSON.stringify({
      status: "failed",
      reason: error instanceof Error ? error.message : "fixture-failure",
      stage: harness?.client.stage,
      rows: harness?.rows ?? [],
      hostUnits,
      transport: harness?.client.observations,
      subsequentRows: "unrun after decisive failure",
    });
  } finally {
    harness?.dispose();
  }
}
