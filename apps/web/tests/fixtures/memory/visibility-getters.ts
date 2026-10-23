import * as api from "#memory-bindings";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { visibilityState, visibilityStroke, visibilityQuery } from "./visibility-fixture.ts";

export function visibilityGetters() {
  const { check, report } = assertions();
  const s = visibilityStroke(visibilityState(), 1);
  const frame = frames.capture(s);
  const value = api.memoryFrameVisibility(s.owner, s.session, s.scene, frame.id, 0n, 0n);
  try {
    check(
      value.code === "ok" && value.done && value.next === 0n,
      "nonempty final reply releases cursor immediately",
    );
    for (const key of ["strokes", "chunks", "revisions"]) {
      const first: unknown = Reflect.get(value, key);
      check(
        first instanceof BigUint64Array && first.length === 1,
        "individual generated getter returns one item",
      );
      let duplicate = false;
      try {
        Reflect.get(value, key);
      } catch (error) {
        duplicate = error === "snapshot-consumed";
      }
      check(duplicate, "each array getter rejects duplicate consumption");
    }
    let blocked = false;
    try {
      api.memoryFrameVisibility(s.owner, s.session, s.scene, frame.id, 0n, 0n).free();
    } catch (error) {
      blocked = error === "boundary-capacity";
    }
    check(blocked, "one live generated wrapper blocks subsequent export");
  } finally {
    value.free();
  }
  const next = visibilityQuery(s, frame.id);
  check(
    next.code === "ok" && next.done && next.strokes.length === 1,
    "wrapper release permits fresh query without lost source",
  );
  frames.release(s, frame.id);
  closeTailFixture(s);
  return report();
}
