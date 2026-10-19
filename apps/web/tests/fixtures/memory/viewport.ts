import * as api from "#memory-bindings";
import { bridge, consume, reply } from "../../../src/memory/bridge.ts";
import { viewportBridge as view } from "../../../src/memory/viewport-bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { viewportNumerics } from "./viewport-numerics.ts";
import { panPreviewBoundary } from "./pan-preview.ts";
function check(value: boolean, label: string) {
  if (!value) throw Error(label);
}
export function viewportBoundary() {
  const cases: string[] = [];
  let state = bridge.enter(bridge.create().owner);
  state = bridge.metrics(state, 1n, 1024, 768, 1);
  check(view.begin(state, 1, 100, 100).code === "unavailable", "new mapping requires presentation");
  state = bridge.presented(state);
  const before = bridge.mapping(state.owner, state.session);
  const pan = view.begin(state, 1, 100, 100);
  check(pan.code === "ok", "pan begins");
  check(penBridge.undo(pan).code === "active", "history blocked");
  check(penBridge.settings(pan, 8, 0, 0, 0).code === "active", "settings blocked");
  state = view.update(pan, 1n, 160, 180);
  check(state.mapping !== pan.mapping, "preview changes mapping");
  check(view.update(state, 2n, 170, 180).code === "stale-mapping", "captured base required");
  state = view.update(pan, 2n, 170, 180);
  check(state.code === "ok", "captured base update");
  check(view.end(pan, 2n).code === "sequence", "wrong next cancels");
  const restored = bridge.mapping(state.owner, state.session);
  check(
    restored.regionX === before.regionX &&
      restored.localX === before.localX &&
      restored.regionY === before.regionY &&
      restored.localY === before.localY,
    "cancel restores captured center",
  );
  cases.push("captured-base-sequence-cancel-active-guards");
  state = bridge.presented(restored);
  const next = view.begin(state, 2, 100, 100);
  let accessors = 0;
  const hostile = {
    valueOf() {
      accessors++;
      return 120;
    },
  };
  const result = consume(
    "pan-update",
    () =>
      Reflect.apply(api.memoryPanUpdate, undefined, [
        next.owner,
        next.session,
        next.interaction,
        next.mapping,
        1n,
        hostile,
        120,
      ]),
    reply,
  );
  check(
    result.code === "invalid" && result.activeCancelled && accessors === 0,
    "hostile numeric cancels without coercion",
  );
  state = bridge.presented(bridge.read(state.owner));
  const final = view.begin(state, 3, 100, 100);
  state = view.update(final, 1n, 140, 100);
  state = view.end(final, 2n);
  check(state.content === before.content && !bridge.read(state.owner).canUndo, "pan never history");
  check(
    penBridge.begin(state, 5, 200, 200, 0, false).code === "unavailable",
    "unpresented pan mapping rejects ink",
  );
  state = bridge.presented(state);
  for (let i = 0; i < 30; i++) {
    state = view.zoom(state, "in");
    state = bridge.presented(state);
  }
  check(bridge.mapping(state.owner, state.session).zoom === 8, "zoom maximum");
  check(view.zoom(state, "in").code === "noop", "maximum no-op");
  for (let i = 0; i < 40; i++) {
    state = view.zoom(state, "out");
    state = bridge.presented(state);
  }
  check(bridge.mapping(state.owner, state.session).zoom === 0.1, "zoom minimum");
  cases.push("checked-hostile-boundary-mapping-admission-zoom-endpoints");
  bridge.dispose(state.owner);
  cases.push(...viewportNumerics());
  cases.push(...panPreviewBoundary());
  const seed = Reflect.get(api, "fixtureNearPanExhaustion");
  if (typeof seed !== "function") throw Error("fixture missing");
  seed();
  state = bridge.enter(bridge.create().owner);
  state = bridge.presented(bridge.metrics(state, 1n, 1024, 768, 1));
  const near = view.begin(state, 1, 100, 100);
  check(near.code === "ok", "near pan begin");
  state = view.update(near, 1n, 101, 101);
  check(state.code === "ok", "last safe preview");
  state = view.update(near, 2n, 102, 102);
  check(
    state.code === "exhausted" && state.activeCancelled,
    "reserved cancellation and suspension",
  );
  check(bridge.leave(state).code === "ok", "reserved departure");
  bridge.dispose(state.owner);
  cases.push("pan-near-exhaustion-cancel-suspend-leave");
  return { cases, accessors };
}
