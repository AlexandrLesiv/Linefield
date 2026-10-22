import { bridge } from "../../../src/memory/bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import {
  visibilityState,
  visibilityStroke,
  visibilityQuery,
  visibilityDrain,
  visibilityFault,
} from "./visibility-fixture.ts";
export function visibilityPressure() {
  const { check, report } = assertions();
  let s = visibilityState();
  const empty = frames.capture(s);
  const baseline = visibilityQuery(s, empty.id);
  check(
    baseline.done && baseline.next === 0n && baseline.indexBytes === 0,
    "empty query retains no cursor or index heap",
  );
  frames.release(s, empty.id);
  s = visibilityStroke(s, 32769);
  s = visibilityStroke(s, 1, 700);
  const frame = frames.capture(s);
  check(frame.code === "ok", "captured complete prefix");
  const before = bridge.read(s.owner).derivedCharge;
  const coldFirst = visibilityQuery(s, frame.id);
  const pending = bridge.read(s.owner).derivedCharge;
  check(
    !coldFirst.done && coldFirst.cursorBytes > baseline.cursorBytes,
    "positive pending cursor stack",
  );
  check(
    pending - before === coldFirst.indexBytes + coldFirst.cursorBytes - baseline.cursorBytes,
    "actual derived delta equals index heap plus live cursor heap",
  );
  const cold = visibilityDrain(s, frame.id, 0n, coldFirst);
  check(
    bridge.read(s.owner).derivedCharge - before === coldFirst.indexBytes,
    "done releases cursor heap while retained arena remains charged",
  );
  check(
    cold.values.length === 258 && cold.hulls === 258 && cold.calls > 1,
    "cold visible257 chunks plus next source",
  );
  check(new Set(cold.values).size === cold.values.length, "no duplicate chunks");
  const warm = visibilityDrain(s, frame.id);
  check(
    warm.values.join() === cold.values.join() && warm.hulls === 0,
    "warm exact source order without hull reconstruction",
  );
  check(visibilityFault(4, true) === "ok", "small optional cache pressure");
  const pressure = visibilityDrain(s, frame.id);
  check(pressure.values.join() === cold.values.join(), "evicted traversal exact equivalence");
  check(visibilityFault(32768, true) === "ok", "cold cache reset");
  const first = visibilityQuery(s, frame.id);
  check(
    first.strokes.length > 0 && !first.done && first.next > 0n,
    "positive consumed split-stroke page",
  );
  check(visibilityFault(0) === "ok", "optional admission failure after output");
  const fallback = visibilityDrain(s, frame.id, 0n, first);
  check(
    fallback.values.join() === cold.values.join(),
    "exact remaining scan preserves split group and following source",
  );
  check(visibilityFault(32768) === "ok", "restore optional admission");
  const completed = visibilityDrain(s, frame.id);
  check(completed.values.join() === cold.values.join(), "cache construction recovers");
  s = edit.panBegin(s, 3, 500, 400, false);
  check(s.code === "ok", "pan begin accepted");
  const panMapping = s.mapping;
  s = edit.panUpdate(s, 1n, 1500, 400, false);
  check(s.code === "ok", "pan update accepted");
  s = edit.panEnd({ ...s, mapping: panMapping }, 1n);
  check(s.code === "ok", "pan end uses captured interaction mapping and final sequence");
  const away = frames.capture(s);
  const culled = visibilityDrain(s, away.id);
  check(
    culled.values.length === 0 && culled.hulls === 0 && culled.visits === 1,
    "warm parent rejects offscreen prefix",
  );
  frames.release(s, away.id);
  s = edit.resetView(s);
  check(s.code === "ok", "reset view accepted");
  const restored = frames.capture(s);
  check(
    visibilityDrain(s, restored.id).values.join() === cold.values.join(),
    "restored view exact source equivalence",
  );
  frames.release(s, restored.id);
  frames.release(s, frame.id);
  closeTailFixture(s);
  return { ...report(), cold, warm, pressure, fallback, culled };
}
