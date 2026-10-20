import { bridge } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { accepted } from "../undo-input.ts";
import { create, append, longPoint } from "./seed.ts";
import type { Shape } from "./catalogue.ts";
import type { Harness } from "./harness.ts";
export async function performanceCase(shape: Shape, h: Harness) {
  let state = await create(h.width, h.height);
  try {
    await h.initialize(state);
    state = accepted(penBridge.settings(state, 8, 0, 0, 0));
    const point = longPoint(shape, h.width, h.height);
    const first = point(0);
    state = accepted(penBridge.begin(state, 1, first[0], first[1], first[2], shape === "varying"));
    state = await append(state, 1, 65_536, point, shape === "varying", true);
    for (const mode of ["cold", "warm", "evicted"] as const) {
      const value = await h.frame(state, `${shape}-${mode}`, true, mode === "evicted");
      await h.reference(state, value.pixels, false);
    }
    state = await append(state, 65_537, 256, point, shape === "varying", true);
    const continued = await h.frame(state, `${shape}-continued256`, true);
    await h.reference(state, continued.pixels, false);
    return {
      acceptedSamples: 65_793,
      outcome: "early-rows-survived",
      remaining:
        "EndA/BeginB, history/navigation and Gate3 require continuation of implementation; not passed",
    };
  } finally {
    bridge.dispose(state.owner);
  }
}
