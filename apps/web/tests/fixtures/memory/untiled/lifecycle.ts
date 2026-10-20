import { bridge } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { accepted } from "../undo-input.ts";
import { inkPixels, comparePixels } from "../cpu-raster/raster.ts";
import { prefixCases, redoBranch } from "./identity-cases.ts";
import { create } from "./seed.ts";
import { capture, fingerprint } from "./capture.ts";
import type { Harness } from "./harness.ts";
export async function lifecycle(h: Harness) {
  let state = await create(h.width, h.height);
  try {
    state = accepted(penBridge.settings(state, 32, 0, 0, 0));
    state = accepted(penBridge.begin(state, 1, h.width / 2, h.height / 2, 0, false));
    state = accepted(penBridge.end(state, 1n));
    const dot = await h.frame(state, "known-dot");
    const center = (Math.floor(h.height / 2) * h.width + Math.floor(h.width / 2)) * 4;
    if (dot.pixels[center] !== 0 || dot.pixels[0] !== 255 || !inkPixels(dot.pixels))
      throw Error("known-dot-coverage");
    await h.reference(state, dot.pixels);
    const original = JSON.stringify(fingerprint((await capture(state, h.width, h.height)).frame));
    state = accepted(penBridge.settings(state, 16, 0.8, 0.1, 0.2));
    state = accepted(penBridge.begin(state, 2, h.width / 2, h.height / 2, 0, false));
    state = accepted(penBridge.end(state, 1n));
    const colored = await h.frame(state, "paint-order");
    await h.reference(state, colored.pixels);
    if (comparePixels(dot.pixels, colored.pixels).differentChannels === 0)
      throw Error("color-order-missing");
    state = accepted(penBridge.undo(state));
    const smallUndo = await h.frame(state, "unaffected-path-after-undo");
    if (smallUndo.result.builds || comparePixels(dot.pixels, smallUndo.pixels).differentChannels)
      throw Error("unaffected-rebuilt-or-changed");
    state = accepted(penBridge.begin(state, 3, -1000, -1000, 0, false));
    const hidden = await h.frame(state, "offscreen-prefix");
    if (comparePixels(dot.pixels, hidden.pixels).differentChannels) throw Error("offscreen-ink");
    state = accepted(penBridge.cancel(state, "blur"));
    const cancelled = await h.frame(state, "focus-cancel");
    if (
      comparePixels(dot.pixels, cancelled.pixels).differentChannels ||
      original !== JSON.stringify(fingerprint((await capture(state, h.width, h.height)).frame))
    )
      throw Error("cancel-projection-history");
    state = await redoBranch(h, state, colored.pixels);
    state = await prefixCases(h, state);
    const old = (await capture(state, h.width, h.height)).frame;
    const pending = h.client.run({ frame: old, fresh: true, guarded: false });
    state = accepted(penBridge.undo(state));
    const stale = await pending;
    h.rejectPublication(old, stale);
    if (h.current(old)) throw Error("stale-publication-admitted");
    h.rows.push({ label: "old-completion-after-undo", rejectedBeforePublication: true });
    state = accepted(penBridge.redo(state));
    state = accepted(penBridge.begin(state, 4, 10, 10, 0, false));
    state = accepted(bridge.metrics(state, 2n, h.width, h.height, 1.25));
    if (!state.activeCancelled) throw Error("remap-did-not-cancel");
    state = accepted(bridge.metrics(state, 3n, h.width, h.height, 1));
    state = accepted(bridge.presented(state));
    const remap = await h.frame(state, "remap-rebuild");
    if (remap.result.builds !== 1) throw Error("mapping-cache-reused");
    await h.reference(state, remap.pixels);
    for (const fault of ["allocation", "page"] as const) {
      const full = (await capture(state, h.width, h.height)).frame;
      const result = await h.client.run({ frame: full, fresh: false, guarded: false, fault });
      result.bitmap?.close();
      h.cursors = [];
      if (
        result.status !== "failed" ||
        result.handles.paths ||
        result.handles.builders ||
        !h.current(full) ||
        bridge.read(state.owner).strokeCount !== 1n
      )
        throw Error("failure-isolation");
      h.rows.push({
        label: `injected-${fault}`,
        status: "expected-rejection",
        reason: result.reason,
        handles: result.handles,
        observableStatePreserved: true,
      });
    }
    const restored = await h.frame(state, "after-failure-rebuild");
    await h.reference(state, restored.pixels);
    state = accepted(penBridge.undo(state));
    state = accepted(penBridge.begin(state, 5, -1000, -1000, 0, false));
    state = accepted(penBridge.end(state, 1n));
    if (bridge.read(state.owner).canRedo || penBridge.redo(state).code !== "noop")
      throw Error("new-end-kept-redo");
    const blank = await h.frame(state, "known-offscreen-white");
    if (inkPixels(blank.pixels)) throw Error("offscreen-not-white");
    await h.reference(state, blank.pixels);
    return {
      checks: "dot/order/offscreen/undo/cancel/remap/stale/failure",
      scope: "browser-hosted command-driven conformance, not native focus E2E",
    };
  } finally {
    bridge.dispose(state.owner);
  }
}
