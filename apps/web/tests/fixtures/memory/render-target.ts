import * as api from "#memory-bindings";
import { bridge, consume, reply } from "../../../src/memory/bridge.ts";
import { viewportBridge as view } from "../../../src/memory/viewport-bridge.ts";
import { penBridge as pen } from "../../../src/memory/pen-bridge.ts";
import { targetBridge as target } from "../../../src/memory/render-target-bridge.ts";
import { panPreview } from "../../../src/memory/pan-preview.ts";
function check(ok: boolean, label: string) {
  if (!ok) throw Error(label);
}
export function renderTargetBoundary() {
  let s = bridge.enter(bridge.create().owner);
  s = bridge.presented(bridge.metrics(s, 1n, 1024, 768, 2));
  s = pen.end(pen.begin(s, 1, 200, 200, 0, false), 1n);
  s = bridge.presented(s);
  const content = s.content;
  const p = view.begin(s, 1, 0, 0);
  s = view.update(p, 1n, 100, 0);
  const t = target.capture(s);
  check(t.code === "ok" && target.capture(s).code === "active", "single captured target");
  const id = target.ids(s, t.target, 0n).ids[0]!;
  const g = target.stroke(s, t.target, id);
  const before = target.page(s, t.target, id, g.geometry, 0n).points;
  s = view.update(p, 2n, 200, 0);
  check(
    target.page(s, t.target, id, g.geometry, 0n).points.join() === before.join(),
    "captured projection stable during pan",
  );
  check(
    target.page(s, t.target, id, g.geometry + 1n, 0n).code === "stale-scene",
    "geometry fenced",
  );
  check(target.page(s, t.target, id, g.geometry, 1n).code === "invalid", "invalid contour cursor");
  check(target.transform(s, t.target).canAdopt, "forward pan candidate covers old intersection");
  check(
    target.adopt({ ...s, presentation: s.presentation + 1n }, t.target).code === "stale-scene",
    "stale publication rejected",
  );
  check(target.adopt(s, t.target).code === "ok", "compatible candidate adopted");
  check(
    !bridge.read(s.owner).canBeginInk && panPreview(s).sourceMapping === t.sourceMapping,
    "transformed adoption not exact readiness",
  );
  const second = target.capture(s);
  s = view.update(p, 3n, 0, 0);
  check(!target.transform(s, second.target).canAdopt, "reversal cannot erase prior coverage");
  check(target.adopt(s, second.target).code === "unavailable", "unsafe candidate rejected");
  target.release(s, second.target);
  const exact = target.capture(s);
  check(target.adopt(s, exact.target).code === "ok", "exact current candidate admitted");
  s = bridge.presented(s);
  check(
    panPreview(s).active && !bridge.read(s.owner).canBeginInk,
    "ack retains active pan origin and input guard",
  );
  s = pen.cancel(p, "escape");
  check(
    s.content === content && panPreview(s).offsetX === 0,
    "promotion did not change cancel base/history",
  );
  s = bridge.presented(s);
  s = view.rotate(s, "right");
  const rotating = target.capture(s);
  s = view.rotate(s, "left");
  check(target.ids(s, rotating.target, 0n).code === "stale-scene", "rotation invalidates target");
  // Source is now rotated15 degrees; candidate captures current0. Test actual polygon,
  // including a diagonal reversal which must not be admitted merely by its bounding box.
  s = bridge.presented(s);
  s = view.rotate(s, "right");
  s = bridge.presented(s);
  s = view.rotate(s, "left");
  const drag = view.begin(s, 2, 0, 0);
  s = view.update(drag, 1n, 100, 100);
  const diagonal = target.capture(s);
  s = view.update(drag, 2n, -100, -100);
  check(!target.transform(s, diagonal.target).canAdopt, "rotated corner coverage conservative");
  target.release(s, diagonal.target);
  s = pen.cancel(drag, "escape");
  s = bridge.presented(s);
  const resizePan = view.begin(s, 3, 0, 0);
  const stale = target.capture(resizePan);
  s = bridge.suspend(resizePan, 2n);
  s = bridge.metrics(s, 3n, 1024, 768, 2);
  check(target.ids(s, stale.target, 0n).code === "stale-scene", "same-size surface epoch fenced");
  let accesses = 0;
  const hostile = {
    valueOf() {
      accesses++;
      return 1n;
    },
  };
  const invalid = consume(
    "render-capture",
    () => Reflect.apply(api.memoryRenderCapture, undefined, [hostile, s.session, s.mapping]),
    reply,
  );
  check(invalid.code === "invalid" && accesses === 0, "hostile target args never coerced");
  bridge.dispose(s.owner);
  return [
    "WMP-11-LIVE captured-pages-single-target-coverage-reversal-exact-ready-cancel-rotation-surface-hostile",
  ];
}
