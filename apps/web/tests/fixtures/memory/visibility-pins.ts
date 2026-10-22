import { frames } from "../../../src/memory/frame-bridge.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import {
  visibilityState,
  visibilityStroke,
  visibilityQuery,
  visibilityDrain,
  visibilityFault,
} from "./visibility-fixture.ts";

export function visibilityPins() {
  const { check, report } = assertions();
  let s = visibilityStroke(visibilityState(), 32769);
  const r = frames.capture(s);
  const original = visibilityDrain(s, r.id);
  s = visibilityStroke(s, 129, 700);
  const n = frames.capture(s);
  const firstR = visibilityQuery(s, r.id);
  const firstN = visibilityQuery(s, n.id);
  check(
    firstR.strokes.length === 128 && firstN.strokes.length === 128 && !firstR.done && !firstN.done,
    "two warm pinned cursors after emitted split-stroke output",
  );
  check(
    visibilityFault(4) === "ok",
    "force optional replacement pressure with both cursors pinned",
  );
  const extended = visibilityDrain(s, n.id, 0n, firstN);
  const retained = visibilityDrain(s, r.id, 0n, firstR);
  check(extended.hulls > 0, "new source requires insertion during pinned traversal");
  check(
    retained.values.join() === original.values.join(),
    "other cursor preserves original exact order after pressure",
  );
  check(
    extended.values.slice(0, original.values.length).join() === original.values.join() &&
      extended.values.length === original.values.length + 2,
    "new source follows complete predecessor once",
  );
  check(
    new Set(extended.values).size === extended.values.length,
    "no repeated output after index replacement",
  );
  check(visibilityFault(32768) === "ok", "restore optional limit");
  frames.release(s, r.id);
  frames.release(s, n.id);
  closeTailFixture(s);
  return { ...report(), original, extended, retained };
}
