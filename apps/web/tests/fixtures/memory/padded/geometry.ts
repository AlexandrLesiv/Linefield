import { bridge } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import { viewportBridge } from "../../../../src/memory/viewport-bridge.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
import { accepted, turn } from "../undo-input.ts";
import { geometry } from "../repaint/geometry.ts";
import type { Case } from "./catalogue.ts";

export async function capture(item: Case, width: number, height: number) {
  if (item.id === "control-256") return geometry(256, "coincident", width, height);
  let state = accepted(bridge.create());
  const seedStart = performance.now();
  try {
    state = accepted(bridge.enter(state.owner));
    state = accepted(bridge.metrics(state, 1n, width, height, 1));
    state = accepted(bridge.presented(state));
    state = accepted(penBridge.settings(state, item.width, 0, 0, 0));
    for (let i = 0; bridge.mapping(state.owner, state.session).zoom > item.zoom && i < 32; i++) {
      state = accepted(viewportBridge.zoom(state, "out"));
      state = accepted(bridge.presented(state));
    }
    if (bridge.mapping(state.owner, state.session).zoom !== item.zoom) throw Error("fixture-zoom");
    const points = input(item, width, height);
    const first = points[0]!;
    state = accepted(penBridge.begin(state, 1, first.x, first.y, first.pressure, item.pressure));
    for (let i = 1; i < points.length; i += 256) {
      const batch = points.slice(i, i + 256);
      state = accepted(
        penBridge.append(state, BigInt(i), {
          x: Float64Array.from(batch, (p) => p.x),
          y: Float64Array.from(batch, (p) => p.y),
          pressure: Float64Array.from(batch, (p) => p.pressure),
          hasPressure: new Uint8Array(batch.length).fill(item.pressure ? 1 : 0),
        }),
      );
    }
    if (item.rotation) {
      state = accepted(penBridge.end(state, BigInt(points.length)));
      for (let i = 0; i < item.rotation; i++) {
        state = accepted(viewportBridge.rotate(state, "right"));
        state = accepted(bridge.presented(state));
      }
    }
    const seedWallMs = performance.now() - seedStart;
    const scene = bridge.scene(state);
    accepted(scene);
    if (!scene.done || scene.ids.length !== 1) throw Error("fixture-scene");
    const stroke = scene.ids[0]!;
    const status = penBridge.stroke(state, stroke);
    accepted(status);
    const pages: PathPage[] = [];
    let offset = 0n,
      queryMs = 0,
      maximumQueryMs = 0;
    while (offset < status.verbs) {
      const start = performance.now();
      const page = penBridge.page(state, stroke, status.geometry, offset);
      const elapsed = performance.now() - start;
      queryMs += elapsed;
      maximumQueryMs = Math.max(maximumQueryMs, elapsed);
      accepted(page);
      if (page.scene !== state.scene || page.geometry !== status.geometry || !page.verbs.length)
        throw Error("fixture-prefix");
      offset += BigInt(page.verbs.length);
      if (page.done !== (offset === status.verbs) || (!page.done && page.next !== offset))
        throw Error("fixture-progress");
      pages.push(page);
      await turn();
    }
    return { pages, seedWallMs, queryMs, maximumQueryMs, verbs: Number(status.verbs) };
  } finally {
    bridge.dispose(state.owner);
  }
}

function input(item: Case, width: number, height: number) {
  let cx = width / 2 + item.phase[0],
    cy = height / 2 + item.phase[1];
  if (item.anchor === "left" || item.anchor === "corner") cx = item.phase[0];
  if (item.anchor === "corner") cy = item.phase[1];
  if (item.anchor === "bottom-right") {
    cx = width - item.phase[0];
    cy = height - item.phase[1];
  }
  return Array.from({ length: item.samples }, (_, i) => {
    let x = cx,
      y = cy;
    if (item.shape === "line" || item.shape === "diagonal" || item.shape === "pressure") {
      x += -48 + (96 * i) / (item.samples - 1);
      if (item.shape === "diagonal") y += -48 + (96 * i) / (item.samples - 1);
    } else if (item.shape === "retraced") {
      x += 10 * Math.cos(i * 0.8);
      y += 10 * Math.sin(i * 2.4);
    } else if (item.shape === "crossing") {
      x += [-40, 40, -40, 40][i]!;
      y += [-40, 40, 40, -40][i]!;
    }
    return { x, y, pressure: item.shape === "pressure" ? i % 2 : 0 };
  });
}
