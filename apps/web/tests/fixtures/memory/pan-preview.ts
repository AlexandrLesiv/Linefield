import * as api from "#memory-bindings";
import { bridge, consume, reply } from "../../../src/memory/bridge.ts";
import { panPreview } from "../../../src/memory/pan-preview.ts";
import { viewportBridge as view } from "../../../src/memory/viewport-bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
function check(value: boolean, label: string) {
  if (!value) throw Error(label);
}
export function panPreviewBoundary() {
  let state = bridge.enter(bridge.create().owner);
  state = bridge.presented(bridge.metrics(state, 1n, 1024, 768, 2));
  const still = view.begin(state, 1, 100, 100);
  state = view.end(still, 1n);
  state = bridge.presented(state);
  check(panPreview(state).code === "unavailable", "zero move acknowledgement retires origin");
  const pan = view.begin(state, 1, 100, 100);
  const source = panPreview(pan);
  state = view.update(pan, 1n, 150.25, 180.5);
  const shifted = panPreview(state);
  check(
    shifted.active && shifted.offsetX === 100.5 && shifted.offsetY === 161,
    "fractional backing offset",
  );
  check(panPreview(pan).code === "stale-mapping", "stale mapping query rejects");
  state = view.end(pan, 2n);
  check(
    !panPreview(state).active && !bridge.read(state.owner).canBeginInk,
    "preview not readiness",
  );
  const second = view.begin(state, 2, 0, 0);
  check(second.code === "ok", "re-pan before exact frame");
  state = view.update(second, 1n, -50.25, -80.5);
  check(panPreview(state).sourceMapping === source.sourceMapping, "same frozen origin");
  check(panPreview(state).offsetX === 0 && panPreview(state).offsetY === 0, "absolute reversal");
  state = penBridge.cancel(second, "escape");
  check(panPreview(state).offsetX === 100.5, "second cancellation restores second base");
  let accessors = 0;
  const hostile = {
    valueOf() {
      accessors++;
      return state.mapping;
    },
  };
  const invalid = consume(
    "pan-preview",
    () => Reflect.apply(api.memoryPanPreview, undefined, [state.owner, state.session, hostile]),
    reply,
  );
  check(invalid.code === "invalid" && accessors === 0, "no hostile coercion");
  check(panPreview(state).offsetX === 100.5, "invalid query unchanged");
  state = bridge.metrics(state, 2n, 1000, 700, 2);
  check(panPreview(state).code === "unavailable", "metrics invalidates origin");
  state = bridge.presented(state);
  for (let i = 0; i < 20; i++) state = bridge.presented(view.zoom(state, "out"));
  for (let i = 0; i < 3; i++) {
    const p = view.begin(state, 1, 0, 0);
    state = view.update(p, 1n, 16000, 0);
    state = view.end(p, 2n);
  }
  check(panPreview(state).outside, "remote regional source is outside");
  for (let i = 0; i < 3; i++) {
    const p = view.begin(state, 1, 0, 0);
    state = view.update(p, 1n, -16000, 0);
    state = view.end(p, 2n);
  }
  check(
    !panPreview(state).outside && Math.abs(panPreview(state).offsetX) < 1e-9,
    "regional reversal retained",
  );
  const old = state;
  bridge.leave(state);
  state = bridge.enter(state.owner);
  check(panPreview(old).code === "stale-session", "session fenced");
  bridge.dispose(state.owner);
  return ["pan-preview-source-fences-fractional-backing-repan-outside-reversal-no-readiness"];
}
