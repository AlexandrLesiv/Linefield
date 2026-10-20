import { loadEngine } from "../../../../src/memory/loader.ts";
import { bridge } from "../../../../src/memory/bridge.ts";
import type { ReplyValue } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { accepted } from "../undo-input.ts";
import { sizes } from "../padded/catalogue.ts";
import { Harness } from "../untiled/harness.ts";
import { create, append, longPoint } from "../untiled/seed.ts";
import { hostUnits } from "../untiled/telemetry.ts";

const button = document.querySelector("button");
const output = document.querySelector("#result");
if (!button || !output) throw Error("fixture-markup");
button.addEventListener("click", () => {
  button.disabled = true;
  void run();
});

async function run() {
  let harness: Harness | undefined;
  let state: ReplyValue | undefined;
  let acceptedSamples: number | undefined;
  let engineBytes: (() => number) | undefined;
  let status = "completed";
  let reason: string | undefined;
  const query = new URLSearchParams(location.search);
  const size = sizes.find((value) => value.id === query.get("size"));
  const shape = query.get("shape");
  try {
    if (!size || (shape !== "moving" && shape !== "sparse" && shape !== "varying"))
      throw Error("fixture-row");
    const engine = await loadEngine();
    engineBytes = () => engine.bytes();
    state = await create(size.width, size.height);
    harness = new Harness(size.width, size.height);
    await harness.initialize(state);
    state = accepted(penBridge.settings(state, 8, 0, 0, 0));
    const point = longPoint(shape, size.width, size.height);
    const first = point(0);
    state = accepted(penBridge.begin(state, 1, first[0], first[1], first[2], shape === "varying"));
    state = await append(state, 1, 65_536, point, shape === "varying", true);
    acceptedSamples = 65_537;
    await harness.frame(state, `${shape}-cold`, true);
  } catch (error: unknown) {
    status = "failed";
    reason = error instanceof Error ? error.message : "fixture-failure";
  } finally {
    output!.textContent = JSON.stringify({
      status,
      reason,
      shape,
      size,
      acceptedSamples: acceptedSamples ?? "not observed after interrupted seed",
      stage: harness?.client.stage,
      rows: harness?.rows ?? [],
      hostUnits,
      transport: harness?.client.observations,
      rustHeapCapacity: engineBytes?.(),
      page: {
        visibility: document.visibilityState,
        dpr: devicePixelRatio,
        width: innerWidth,
        height: innerHeight,
      },
      scope: "unchanged R07 CPU cold diagnostic; no candidate, p95 or physical input evidence",
      initialization: "untimed",
      remainingDiagnostics: "independent fresh pages; failed rows remain failed",
    });
    harness?.dispose();
    if (state) bridge.dispose(state.owner);
  }
}
