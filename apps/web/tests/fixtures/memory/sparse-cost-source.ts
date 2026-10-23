import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { queryReady } from "./query-readiness.ts";
export type CostKind = "thin" | "thick" | "compact" | "diagonal" | "multipage";
export type CostPage = { data: Float32Array; matrix: Float32Array; id: bigint };
export type CostGroup = { pages: CostPage[]; color: number[]; samples: number };
export function sparseCostSource(width: number, height: number, kind: CostKind) {
  let state = bridge.enter(bridge.create().owner);
  const accepted = () => {
    if (state.code !== "ok" && state.code !== "noop") throw Error(`cost source ${state.code}`);
  };
  state = bridge.metrics(state, 1n, width, height, 1);
  accepted();
  const groups: CostGroup[] = [];
  for (let group = 0; group < (kind === "multipage" ? 1 : 8); group++) {
    state = queryReady(state);
    state = edit.style(state, kind === "thick" ? 512 : 2, [0.15 + group * 0.025, 0.3, 0.65]);
    accepted();
    const count = kind === "diagonal" ? 2 : kind === "multipage" ? 257 : 64;
    const x = new Float64Array(count),
      y = new Float64Array(count);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1),
        angle = t * Math.PI * 2;
      const radius = kind === "compact" ? 0.015 : 0.375;
      if (kind === "diagonal" || kind === "multipage") {
        x[i] = width * (0.125 + 0.75 * (kind === "multipage" ? i % 2 : t));
        y[i] = height * (0.125 + 0.75 * t) + group * 0.25;
      } else {
        const asymmetric = 0.88 + 0.12 * Math.cos(3 * angle);
        x[i] = width * (0.5 + radius * asymmetric * Math.cos(angle)) + group * 0.25;
        y[i] = height * (0.5 + radius * Math.sin(angle)) + group * 0.125;
      }
    }
    state = edit.begin(state, 1, x[0] ?? 0, y[0] ?? 0, 1, true);
    accepted();
    for (let first = 1; first < count; first += 64) {
      const end = Math.min(count, first + 64),
        length = end - first;
      state = edit.append(
        state,
        BigInt(first),
        x.slice(first, end),
        y.slice(first, end),
        new Float64Array(length).fill(1),
        new Uint8Array(length).fill(1),
      );
      accepted();
    }
    state = edit.end(state, BigInt(count));
    accepted();
  }
  const ids = scene.ids(state, 0n);
  if (ids.code !== "ok" || !ids.done || ids.ids.length !== (kind === "multipage" ? 1 : 8))
    throw Error("cost source count");
  for (const id of ids.ids) {
    const stroke = scene.stroke(state, id),
      pages: CostPage[] = [];
    if (stroke.code !== "ok" || stroke.active) throw Error("cost stroke");
    for (let chunk = 0n; chunk * 128n < stroke.count; chunk++) {
      const revision = stroke.count < chunk * 128n + 129n ? stroke.count : chunk * 128n + 129n;
      let cursor = 0n;
      do {
        const page = scene.page(state, id, revision, chunk, 1, cursor);
        if (page.code !== "ok" || !page.data.length) throw Error(`cost page ${page.code}`);
        const placement = scene.placement(state, id, page.page);
        if (placement.code !== "ok" || !placement.available) throw Error("cost placement");
        pages.push({ data: page.data, matrix: placement.matrix, id: page.page });
        cursor = page.next;
        if (page.done !== (cursor === 0n) || pages.length > 128) throw Error("cost page bound");
      } while (cursor);
    }
    groups.push({ pages, color: stroke.color, samples: Number(stroke.count) });
  }
  if (kind === "multipage" && !groups.some((g) => g.pages.length > 1))
    throw Error("missing multipage source");
  return {
    groups,
    close: () => {
      for (const group of groups)
        for (const page of group.pages)
          if (scene.release(state, page.id) !== "ok") throw Error("cost release");
      bridge.leave(state);
      bridge.dispose(state.owner);
    },
  };
}
