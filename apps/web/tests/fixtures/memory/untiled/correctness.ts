import { bridge } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { accepted } from "../undo-input.ts";
import { comparePixels, inkPixels } from "../cpu-raster/raster.ts";
import type { Case } from "../padded/catalogue.ts";
import { seed } from "./seed.ts";
import { fingerprint } from "./capture.ts";
import { Harness } from "./harness.ts";
export async function correctness(item: Case, width: number, height: number, harness: Harness) {
  let state = await seed(item, width, height);
  try {
    const active = await harness.frame(state, "cold-final-prefix");
    const before = await harness.reference(state, active.pixels);
    if (!inkPixels(active.pixels)) throw Error("missing-corpus-ink");
    if (item.id === "thin-horizontal" && inkPixels(active.pixels) !== 96)
      throw Error("known-thin-coverage");
    if (!item.rotation) state = accepted(penBridge.end(state, BigInt(item.samples)));
    const end = await harness.frame(state, "accepted-end");
    if (comparePixels(active.pixels, end.pixels).differentChannels)
      throw Error("end-prefix-parity");
    const after = await harness.reference(state, end.pixels);
    if (JSON.stringify(fingerprint(before)) !== JSON.stringify(fingerprint(after)))
      throw Error("end-projection-mutation");
    const warm = await harness.frame(state, "warm-terminal");
    if (warm.result.builds || warm.result.appendedVerbs || warm.result.hits !== 1)
      throw Error("warm-rebuilt");
    if (comparePixels(end.pixels, warm.pixels).differentChannels) throw Error("warm-parity");
    const evicted = await harness.frame(state, "evicted-terminal", false, true);
    if (evicted.result.builds !== 1 || comparePixels(end.pixels, evicted.pixels).differentChannels)
      throw Error("evicted-parity");
    state = accepted(penBridge.undo(state));
    const undo = await harness.frame(state, "undo-hidden");
    if (inkPixels(undo.pixels) || bridge.read(state.owner).strokeCount !== 0n)
      throw Error("undo-membership");
    state = accepted(penBridge.redo(state));
    const redo = await harness.frame(state, "redo-retained");
    if (
      redo.result.builds ||
      redo.result.hits !== 1 ||
      comparePixels(end.pixels, redo.pixels).differentChannels
    )
      throw Error("redo-parity");
    const restored = await harness.reference(state, redo.pixels);
    if (JSON.stringify(fingerprint(after)) !== JSON.stringify(fingerprint(restored)))
      throw Error("redo-projection-mutation");
    if (bridge.read(state.owner).strokeCount !== 1n) throw Error("redo-history");
    if (item.id === "control-256") await harness.gpu(state, redo.pixels);
    return {
      acceptedSamples: item.samples,
      projectedEndRedo: "exact",
      history: "one-stroke-undo-redo",
      canonicalObservation:
        "ordered accepted inputs and projected geometry; raw samples unavailable in existing ABI",
    };
  } finally {
    bridge.dispose(state.owner);
  }
}
