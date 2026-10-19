import { bridge } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { viewportBridge } from "../../../../src/memory/viewport-bridge.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
import { accepted } from "../undo-input.ts";
import { geometry } from "../repaint/geometry.ts";

export type Shape = "thin" | "coincident" | "retraced";
export async function capture(samples: number, shape: Shape, width: number, height: number) {
  if (shape !== "thin") return geometry(samples, shape, width, height);
  let state = accepted(bridge.create());
  const seedStart = performance.now();
  try {
    state = accepted(bridge.enter(state.owner));
    state = accepted(bridge.metrics(state, 1n, width, height, 1));
    state = accepted(bridge.presented(state));
    state = accepted(penBridge.settings(state, 1, 0, 0, 0));
    let mapping = bridge.mapping(state.owner, state.session);
    for (let i = 0; mapping.zoom > 0.1 && i < 32; i++) {
      state = accepted(viewportBridge.zoom(state, "out"));
      state = accepted(bridge.presented(state));
      mapping = bridge.mapping(state.owner, state.session);
    }
    if (mapping.zoom !== 0.1) throw Error("thin-zoom");
    state = accepted(penBridge.begin(state, 1, width / 2 - 48, height / 2 + 0.125, 0, true));
    state = accepted(
      penBridge.append(state, 1n, {
        x: new Float64Array([width / 2 + 48]),
        y: new Float64Array([height / 2 + 0.125]),
        pressure: new Float64Array([0]),
        hasPressure: new Uint8Array([1]),
      }),
    );
    const seedWallMs = performance.now() - seedStart;
    const scene = bridge.scene(state);
    accepted(scene);
    if (!scene.done || scene.ids.length !== 1) throw Error("thin-scene");
    const status = penBridge.stroke(state, scene.ids[0]!);
    accepted(status);
    const queryStart = performance.now();
    const page = penBridge.page(state, scene.ids[0]!, status.geometry, 0n);
    const queryMs = performance.now() - queryStart;
    accepted(page);
    if (
      !page.done ||
      page.scene !== state.scene ||
      page.geometry !== status.geometry ||
      BigInt(page.verbs.length) !== status.verbs
    )
      throw Error("thin-prefix");
    const pages: PathPage[] = [page];
    return { pages, seedWallMs, queryMs, maximumQueryMs: queryMs, verbs: Number(status.verbs) };
  } finally {
    bridge.dispose(state.owner);
  }
}
