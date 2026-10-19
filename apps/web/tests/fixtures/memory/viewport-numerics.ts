import { bridge } from "../../../src/memory/bridge.ts";
import { viewportBridge as view } from "../../../src/memory/viewport-bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
function check(value: boolean, label: string) {
  if (!value) throw Error(label);
}
export function viewportNumerics() {
  let state = bridge.enter(bridge.create().owner);
  state = bridge.presented(bridge.metrics(state, 1n, 1024, 768, 1));
  for (let i = 0; i < 10; i++) state = bridge.presented(view.zoom(state, "in"));
  const maximum = view.begin(state, 1, 0, 0);
  state = view.update(maximum, 1n, 40, 80);
  let mapped = bridge.mapping(state.owner, state.session);
  check(
    mapped.regionX === -1n &&
      mapped.localX === 65531 &&
      mapped.regionY === -1n &&
      mapped.localY === 65526,
    "zoom8 exact negative five and ten",
  );
  state = bridge.presented(penBridge.cancel(maximum, "escape"));
  for (let i = 0; i < 20; i++) state = bridge.presented(view.zoom(state, "out"));
  const minimum = view.begin(state, 2, 0, 0);
  state = view.update(minimum, 1n, 40, 40);
  mapped = bridge.mapping(state.owner, state.session);
  check(
    mapped.zoom === 0.1 && mapped.regionX === -1n && mapped.localX === 65136,
    "zoom0.1 exact rational rounds regional remainder",
  );
  state = bridge.presented(penBridge.cancel(minimum, "escape"));
  // 13107.2 is exactly binary64(0.1) * 2^17, so the exact quotient is 131072.
  const crossing = view.begin(state, 3, 13107.2, 0);
  state = view.update(crossing, 1n, 0, 0);
  mapped = bridge.mapping(state.owner, state.session);
  check(mapped.regionX === 2n && mapped.localX === 0, "exact two-region crossing");
  state = bridge.presented(penBridge.cancel(crossing, "escape"));
  const fresh = view.begin(state, 4, 0, 0);
  const stale = view.end(crossing, 2n);
  check(
    stale.code === "stale-interaction" &&
      stale.interaction === fresh.interaction &&
      !stale.activeCancelled,
    "old pan cannot finish new pan",
  );
  mapped = bridge.mapping(state.owner, state.session);
  check(mapped.regionX === 0n && mapped.localX === 0, "stale pan preserves view");
  bridge.dispose(state.owner);
  return [
    "zoom8-negative-center",
    "zoom0.1-regional-rounding",
    "two-region-crossing",
    "stale-end-preserves-fresh-pan",
  ];
}
