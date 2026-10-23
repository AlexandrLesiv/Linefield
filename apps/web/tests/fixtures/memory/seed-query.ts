import * as api from "#memory-bindings";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { frameReuse } from "../../../src/memory/frame-reuse.ts";
import { edit, take } from "../../../src/memory/edit-bridge.ts";
import { captureDisplay } from "../../../src/memory/current-coverage.ts";
import { visibilityState, visibilityStroke } from "./visibility-fixture.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
export function seedQuery() {
  const { check, report } = assertions();
  let s = visibilityState();
  const receipts: bigint[] = [];
  const capture = () => {
    const f = frames.capture(s);
    check(f.code === "ok", "captured actual Prefix");
    receipts.push(f.id);
    return f.id;
  };
  try {
    const empty = capture();
    let q = frameReuse(s, empty, capture());
    check(!q.reusable && q.missReason === "same-prefix", "same-prefix explicit miss");
    s = visibilityStroke(s, 3);
    const one = capture();
    q = frameReuse(s, empty, one);
    check(
      q.code === "ok" && q.reusable && q.sourceCount === 0n && q.targetCount === 1n,
      "empty-prefix one successor positive",
    );
    s = edit.begin(s, 1, 500, 500, 0.5, true);
    s = edit.cancel(s, "escape");
    const latch = take(
      () => api.memoryFrameReuse(s.owner, s.session, s.mapping, empty, one),
      (v) => ({ code: v.code, activeCancelled: v.activeCancelled, reusable: v.reusable }),
    );
    check(latch.activeCancelled && latch.reusable, "read-only success retains cancellation latch");
    const invalid: unknown = Reflect.apply(api.memoryFrameReuse, undefined, [
      s.owner,
      s.session,
      s.mapping,
      Number(empty),
      one,
    ]);
    if (!(invalid instanceof api.FrameReuseSnapshot)) throw Error("generated reuse snapshot");
    check(
      take(
        () => invalid,
        (v) => v.code === "invalid" && v.activeCancelled && !v.reusable,
      ),
      "malformed identity retains latch with false proof",
    );
    const held = api.memoryFrameReuse(s.owner, s.session, s.mapping, empty, one);
    let capacity = false;
    try {
      api.memoryFrameReuse(s.owner, s.session, s.mapping, empty, one);
    } catch (error) {
      capacity = String(error).includes("boundary-capacity");
    } finally {
      held.free();
    }
    check(capacity, "one outstanding snapshot");
    const display = captureDisplay(s);
    receipts.push(display.id);
    check(frameReuse(s, display.id, one).code === "invalid", "DisplayOnly cannot seed");
    s = visibilityStroke(s, 3, 500);
    const two = capture();
    q = frameReuse(s, empty, two);
    check(
      q.code === "ok" && !q.reusable && q.missReason === "successor-count",
      "multiple successors explicit miss",
    );
    check(frameReuse(s, one, two).reusable, "nonempty one successor positive");
    s = edit.view(s, Math.PI / 12, 512, 384, true);
    const rotated = capture();
    q = frameReuse(s, one, rotated);
    check(q.code === "ok" && !q.reusable && q.missReason === "view", "view mismatch miss");
    check(frameReuse(s, one, two).code === "stale-mapping", "old target mapping rejected");
    s = edit.undo(s);
    check(frameReuse(s, two, rotated).code === "stale-scene", "undone source rejected");
    frames.release(s, one);
    check(frameReuse(s, one, rotated).code === "stale-scene", "released source rejected");
    return report();
  } finally {
    for (const id of receipts) frames.release(s, id);
    closeTailFixture(s);
  }
}
