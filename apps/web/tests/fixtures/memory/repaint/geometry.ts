import { bridge } from "../../../../src/memory/bridge.ts";
import { penBridge } from "../../../../src/memory/pen-bridge.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
import { accepted, turn } from "../undo-input.ts";

export type Shape = "coincident" | "retraced";
export async function geometry(samples: number, shape: Shape, width: number, height: number) {
  let state = accepted(bridge.create());
  const pages: PathPage[] = [];
  let queryMs = 0;
  let maximumQueryMs = 0;
  const seedStart = performance.now();
  try {
    state = accepted(bridge.enter(state.owner));
    state = accepted(bridge.metrics(state, 1n, width, height, 1));
    state = accepted(bridge.presented(state));
    state = accepted(penBridge.settings(state, 8, 0, 0, 0));
    const point = (i: number) =>
      [
        width / 2 + 0.375 + (shape === "retraced" ? 10 * Math.cos(i * 0.8) : 0),
        height / 2 + 0.625 + (shape === "retraced" ? 10 * Math.sin(i * 2.4) : 0),
      ] as const;
    const first = point(0);
    state = accepted(penBridge.begin(state, 1, first[0]!, first[1]!, 0, false));
    for (let i = 1; i < samples; i += 256) {
      const count = Math.min(256, samples - i);
      const x = new Float64Array(count);
      const y = new Float64Array(count);
      for (let j = 0; j < count; j++) [x[j], y[j]] = point(i + j);
      state = accepted(
        penBridge.append(state, BigInt(i), {
          x,
          y,
          pressure: new Float64Array(count),
          hasPressure: new Uint8Array(count),
        }),
      );
      await turn();
    }
    const seedWallMs = performance.now() - seedStart;
    const scene = bridge.scene(state);
    accepted(scene);
    if (!scene.done || scene.ids.length !== 1) throw Error("expected-single-prefix");
    const id = scene.ids[0]!;
    const status = penBridge.stroke(state, id);
    accepted(status);
    let offset = 0n;
    while (offset < status.verbs) {
      const start = performance.now();
      const page = penBridge.page(state, id, status.geometry, offset);
      const elapsed = performance.now() - start;
      queryMs += elapsed;
      maximumQueryMs = Math.max(maximumQueryMs, elapsed);
      accepted(page);
      if (page.geometry !== status.geometry || page.scene !== state.scene || !page.verbs.length)
        throw Error("prefix-identity");
      offset += BigInt(page.verbs.length);
      if (page.done !== (offset === status.verbs) || (!page.done && page.next !== offset))
        throw Error("prefix-progress");
      pages.push(page);
      await turn();
    }
    return { pages, seedWallMs, queryMs, maximumQueryMs, verbs: Number(status.verbs) };
  } finally {
    bridge.dispose(state.owner);
  }
}

export function groups(page: PathPage): PathPage[] {
  const result: PathPage[] = [];
  let verbStart = 0,
    pointStart = 0,
    weightStart = 0;
  let points = 0,
    weights = 0;
  for (let i = 0; i < page.verbs.length; i++) {
    const verb = page.verbs[i];
    if (verb === 0 || verb === 1) points += 2;
    else if (verb === 2) {
      points += 4;
      weights++;
    } else if (verb !== 3) throw Error("unknown-verb");
    if (verb !== 3) continue;
    if (i + 1 - verbStart >= 1402 || i + 1 === page.verbs.length) {
      if (i + 1 - verbStart > 1408) throw Error("group-bound");
      result.push({
        ...page,
        verbs: page.verbs.slice(verbStart, i + 1),
        points: page.points.slice(pointStart, points),
        weights: page.weights.slice(weightStart, weights),
      });
      verbStart = i + 1;
      pointStart = points;
      weightStart = weights;
    }
  }
  if (
    verbStart !== page.verbs.length ||
    points !== page.points.length ||
    weights !== page.weights.length
  )
    throw Error("incomplete-contours");
  return result;
}
