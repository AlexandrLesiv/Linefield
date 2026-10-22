import { queryReady } from "./query-readiness.ts";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
function check(value: boolean, label: string) {
  if (!value) throw Error(label);
}
export function gpuContract() {
  let s = bridge.create();
  check(s.code === "ok", "create");
  s = bridge.enter(s.owner);
  s = bridge.metrics(s, 1n, 512, 512, 4);
  s = queryReady(s);
  check(s.code === "ok", "metrics");
  s = edit.view(s, 16, 640, 450, false);
  s = edit.style(s, 512, [0.1, 0.3, 0.7]);
  s = edit.begin(s, 1, 200, 300, 0.5, true);
  check(s.code === "ok", "begin");
  const id = scene.ids(s, 0n).ids[0];
  check(id !== undefined, "active ID");
  if (id === undefined) throw Error("id");
  const initial = scene.page(s, id, 1n, 0n, 64, 0n);
  check(initial.code === "ok", "initial page");
  const repeat = scene.page(s, id, 1n, 0n, 64, 0n);
  check(repeat.page === initial.page, "stable repeated page");
  const old = s;
  s = edit.append(
    s,
    1n,
    new Float64Array([300]),
    new Float64Array([400]),
    new Float64Array([0.8]),
    new Uint8Array([1]),
  );
  check(s.code === "ok", "append");
  check(
    scene.placement(s, id, initial.page).code === "stale-scene",
    "terminal neighbor invalidation",
  );
  check(scene.page(s, id, 2n, 0n, 0.01, 0n).code === "invalid", "insufficient detail");
  check(scene.page(s, id, 2n, 0n, 64, 999999n).code === "invalid", "forged cursor");
  check(
    edit.append(
      old,
      0n,
      new Float64Array([0]),
      new Float64Array([0]),
      new Float64Array([0]),
      new Uint8Array([0]),
    ).activeCancelled,
    "bad current sequence cancels",
  );
  const cancelled = bridge.read(s.owner);
  s = cancelled;
  check(!cancelled.canUndo && cancelled.strokeCount === 0n, "cancel no history");
  s = edit.view(s, 0.05, 640, 450, false);
  s = edit.begin(s, 2, -7000, -7000, 1, true);
  const xs = new Float64Array(127),
    ys = new Float64Array(127),
    pressures = new Float64Array(127).fill(1),
    flags = new Uint8Array(127).fill(1);
  for (let i = 0; i < 127; i++) {
    xs[i] = i % 2 ? -7000 : 7000;
    ys[i] = i % 3 ? 7000 : -7000;
  }
  s = edit.append(s, 1n, xs, ys, pressures, flags);
  check(s.code === "ok", "long coarse source");
  s = edit.end(s, 128n);
  const coarseId = scene.ids(s, 0n).ids[0];
  if (coarseId === undefined) throw Error("coarse stroke");
  const coarse = scene.page(s, coarseId, 128n, 0n, 0.2, 0n);
  check(coarse.code === "ok", "coarse page");
  s = edit.view(s, 16, 640, 450, false);
  check(
    scene.placement(s, coarseId, coarse.page).code === "stale-scene",
    "zoom rejects insufficient page",
  );
  scene.release(s, coarse.page);
  const stroke = scene.ids(s, 0n).ids[0];
  if (stroke === undefined) throw Error("stroke");
  let cursor = 0n,
    pages = 0,
    capsules = 0;
  const start = performance.now();
  for (;;) {
    const p = scene.page(s, stroke, 128n, 0n, 64, cursor);
    check(p.code === "ok", "continuation page");
    check(p.data.length <= 6144, "bounded output");
    pages++;
    capsules += p.data.length / 6;
    scene.release(s, p.page);
    if (p.done) break;
    check(p.next !== cursor && p.next !== 0n, "progress");
    cursor = p.next;
    check(
      pages < 1000000 && performance.now() - start < 30000,
      `bounded fixture work: pages=${pages}, capsules=${capsules}, elapsedMs=${performance.now() - start}, next=${cursor}`,
    );
  }
  check(pages > 1, "multi-page exercised");
  const duration = performance.now() - start;
  s = edit.undo(s);
  check(s.code === "ok", "undo");
  s = edit.undo(s, true);
  check(s.code === "ok", "redo");
  const leave = bridge.leave(s);
  check(leave.code === "ok", "leave");
  check(bridge.dispose(s.owner).code === "ok", "dispose");
  return {
    cases: 11,
    pages,
    capsules,
    durationMs: duration,
    evidence: "synthetic checked-boundary exploration; not physical Wacom or UI latency",
  };
}
