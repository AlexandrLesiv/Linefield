import type { CanvasKit } from "canvaskit-wasm";
import { bridge } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { Presentation } from "../../../src/memory/presentation.ts";
import { accepted, seedUndo } from "./undo-input.ts";
import { preparePaths, deletePaths } from "./undo-paths.ts";
import { drawPaths, pixels } from "./undo-draw.ts";
export async function workerBaseline(kit: CanvasKit, canvas: HTMLCanvasElement) {
  let state = accepted(bridge.create());
  state = accepted(bridge.enter(state.owner));
  state = accepted(bridge.metrics(state, 1n, 1024, 768, 1));
  const display = new Presentation(kit, canvas, 1024, 768);
  display.render();
  state = accepted(bridge.presented(state));
  try {
    state = await seedUndo(state, 1024, 768, false);
    state = accepted(penBridge.undo(state));
    const prepared = await preparePaths(kit, state, 1024, 768, false);
    try {
      drawPaths(kit, display, prepared.paths);
      const hash = await crypto.subtle.digest("SHA-256", Uint8Array.from(pixels(kit, display)));
      return {
        hash: Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join(""),
        kind: "separate-main-CanvasKit-reference; closed before worker-only phase",
      };
    } finally {
      deletePaths(prepared.paths);
    }
  } finally {
    display.dispose();
    bridge.dispose(state.owner);
  }
}
