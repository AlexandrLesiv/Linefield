import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { queryReady } from "./query-readiness.ts";
export function sparseSource(
  width: number,
  height: number,
  strokeWidth: number,
  edge: boolean,
  angle: number,
  line = false,
) {
  let state = bridge.enter(bridge.create().owner);
  state = bridge.metrics(state, 1n, width, height, 1);
  if (state.code !== "ok") throw Error(`metrics ${state.code}`);
  state = queryReady(state);
  state = edit.style(state, strokeWidth, [0.2, 0.4, 0.8]);
  if (state.code !== "ok") throw Error(`style ${state.code}`);
  const x = edge ? width - 1.25 : Math.min(63.75, width / 2 - 0.25);
  const y = edge ? height - 3.25 : Math.min(63.75, height / 2 - 0.25);
  // The width512 work-cap control uses equal radii so all four accepted
  // stationary spans fit one page. Other rows retain actual pressure taper.
  const wideWorkControl = strokeWidth === 512;
  state = edit.begin(state, 1, x, y, wideWorkControl ? 1 : 0.25, true);
  if (state.code !== "ok") throw Error(`begin ${state.code}`);
  state = edit.append(
    state,
    1n,
    Float64Array.from([1, 2, 3], (i) => x + (line ? i * 9 : 0)),
    Float64Array.from([1, 2, 3], (i) => y + (line ? i * 6 : 0)),
    wideWorkControl ? new Float64Array(3).fill(1) : new Float64Array([0.5, 0.75, 1]),
    new Uint8Array(3).fill(1),
  );
  if (state.code !== "ok") throw Error(`append ${state.code}`);
  state = edit.end(state, 4n);
  if (state.code !== "ok") throw Error(`end ${state.code}`);
  state = edit.view(state, angle, x, y, true);
  if (state.code !== "ok" && state.code !== "noop") throw Error(`view ${state.code}`);
  const ids = scene.ids(state, 0n),
    source = ids.ids[0];
  if (ids.code !== "ok" || ids.ids.length !== 1 || !source) throw Error("sparse source");
  const stroke = scene.stroke(state, source);
  if (stroke.code !== "ok" || stroke.count !== 4n || stroke.active) throw Error("sparse revision");
  const page = scene.page(state, source, 4n, 0n, 1, 0n);
  if (
    page.code !== "ok" ||
    !page.done ||
    page.next !== 0n ||
    page.data.length === 0 ||
    (wideWorkControl && page.data.length !== 24)
  )
    throw Error(`whole generated page ${page.code}:${page.data.length}:${page.done}`);
  const placement = scene.placement(state, source, page.page);
  if (placement.code !== "ok" || !placement.available) throw Error("sparse placement");
  return {
    data: page.data,
    matrix: placement.matrix,
    close: () => {
      if (scene.release(state, page.page) !== "ok") throw Error("page release");
      bridge.leave(state);
      bridge.dispose(state.owner);
    },
  };
}
