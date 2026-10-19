import * as api from "#memory-bindings";
import { bridge, consume, reply } from "../../../src/memory/bridge.ts";
import { viewportBridge as view } from "../../../src/memory/viewport-bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { panPreview } from "../../../src/memory/pan-preview.ts";
function check(value: boolean, label: string) {
  if (!value) throw Error(label);
}
function fixture(name: string) {
  const fn = Reflect.get(api, name);
  if (typeof fn !== "function") throw Error("fixture absent");
  fn();
}
export function rotationBoundary() {
  const cases: string[] = [];
  let state = bridge.enter(bridge.create().owner);
  state = bridge.presented(bridge.metrics(state, 1n, 1024, 768, 2));
  const initial = state;
  check(view.rotate(state, "reset").mapping === state.mapping, "reset no generation");
  for (let i = 1; i <= 24; i++) {
    state = view.rotate(state, "right");
    check(state.code === "ok", "rapid step accepted");
    check(bridge.mapping(state.owner, state.session).rotationStep === i % 24, "step canonical");
    check(panPreview(state).sourceMapping === initial.mapping, "original source retained");
    check(!bridge.read(state.owner).canBeginInk, "preview never admits ink");
  }
  const preview = panPreview(state);
  check(
    preview.m11 === 1 &&
      preview.m22 === 1 &&
      preview.m12 === 0 &&
      preview.m21 === 0 &&
      preview.offsetX === 0 &&
      preview.offsetY === 0,
    "24 step exact identity",
  );
  check(bridge.presented(initial).code === "stale-mapping", "old frame rejected");
  check(
    state.content === initial.content && !bridge.read(state.owner).canUndo,
    "no document mutation",
  );
  let accesses = 0;
  const hostile = {
    toString() {
      accesses++;
      return "right";
    },
  };
  const invalid = consume(
    "rotate-step",
    () =>
      Reflect.apply(api.memoryRotateStep, undefined, [
        state.owner,
        state.session,
        state.mapping,
        hostile,
      ]),
    reply,
  );
  check(
    invalid.code === "invalid" && accesses === 0 && invalid.mapping === state.mapping,
    "no coercion atomic",
  );
  check(view.rotate(initial, "right").code === "stale-mapping", "stale command rejected");
  check(
    view.rotate({ ...state, session: state.session + 1n }, "right").code === "stale-session",
    "stale session",
  );
  state = bridge.presented(state);
  const ink = penBridge.begin(state, 1, 512, 384, 0, false);
  check(view.rotate(ink, "right").code === "active", "active ink blocked");
  state = penBridge.cancel(ink, "escape");
  const pan = view.begin(state, 1, 512, 384);
  check(view.rotate(pan, "right").code === "active", "active pan blocked");
  state = bridge.presented(penBridge.cancel(pan, "escape"));
  for (let i = 0; i < 6; i++) state = view.rotate(state, "right");
  state = bridge.presented(state);
  const cardinal = view.begin(state, 2, 0, 0);
  state = view.update(cardinal, 1n, 40, 0);
  const mapping = bridge.mapping(state.owner, state.session);
  check(
    mapping.regionX === 0n &&
      Object.is(mapping.localX, 0) &&
      mapping.regionY === 0n &&
      mapping.localY === 40,
    "90 degree inverse pan",
  );
  state = bridge.presented(penBridge.cancel(cardinal, "escape"));
  const tiny = view.begin(state, 3, 0, 0);
  state = view.update(tiny, 1n, Number.MIN_VALUE, 0);
  const subnormal = bridge.mapping(state.owner, state.session);
  check(
    Object.is(subnormal.localX, 0) &&
      subnormal.regionY === 0n &&
      subnormal.localY === Number.MIN_VALUE,
    "exact positive subnormal preserved",
  );
  bridge.dispose(state.owner);
  cases.push("rapid24-identity-stale-affine-nohistory-hostile-active-cardinal");
  fixture("fixtureRotatedBoundary");
  state = bridge.enter(bridge.create().owner);
  state = bridge.presented(bridge.metrics(state, 1n, 1024, 768, 1));
  for (const point of [
    [0, 0],
    [1024, 0],
    [0, 768],
    [1024, 768],
    [-0.3, 384],
  ]) {
    state = penBridge.begin(state, 1, point[0]!, point[1]!, 0, false);
    check(state.code === "ok", "regional corner admitted");
    state = penBridge.end(state, 1n);
    const id = bridge.scene(state).ids.at(-1)!;
    const page = api.memoryScene(state.owner, state.session, state.scene, id, state.mapping, 0n);
    check(page.code === "ok" && page.verbs.length === 6, "rotated corner paint retained");
    const points = page.points;
    page.free();
    check(
      Math.abs(points[0]! - point[0]! - 0.4) < 0.001 && Math.abs(points[1]! - point[1]!) < 0.001,
      "projected corner aligns",
    );
  }
  fixture("fixtureFarView");
  state = bridge.read(state.owner);
  for (const id of bridge.scene(state).ids) {
    const page = api.memoryScene(state.owner, state.session, state.scene, id, state.mapping, 0n);
    check(page.code === "ok" && page.verbs.length === 0, "opposite i64 region culled safely");
    page.free();
  }
  bridge.dispose(state.owner);
  cases.push("diagonal-regional-boundary-corners-culling-opposite-domain");
  fixture("fixtureNearExhaustion");
  state = bridge.enter(bridge.create().owner);
  state = bridge.presented(bridge.metrics(state, 1n, 1024, 768, 1));
  const stopped = view.rotate(state, "right");
  check(stopped.code === "exhausted" && stopped.mapping === state.mapping, "exhaustion atomic");
  check(bridge.leave(state).code === "ok", "cleanup reserved");
  bridge.dispose(state.owner);
  cases.push("generation-exhaustion-preserves-viewport-and-cleanup");
  return { cases, accesses };
}
