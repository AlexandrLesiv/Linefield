import { bridge } from "../../../src/memory/bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { live } from "../../../src/memory/live-bridge.ts";
import {
  captureDisplay,
  captureLive,
  currentCoverage,
} from "../../../src/memory/current-coverage.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
import { queryReady } from "./query-readiness.ts";
import {
  visibilityState,
  visibilityStroke,
  visibilityQuery,
  visibilityDrain,
} from "./visibility-fixture.ts";
export function visibilityLifetime() {
  const { check, report } = assertions();
  let s = visibilityStroke(visibilityState(), 32769);
  const r = frames.capture(s);
  s = visibilityStroke(s, 32769, 700);
  const n = live.append(s, r.id, currentCoverage(s).completedThrough);
  check(r.code === "ok" && n.code === "ok", "adjacent immutable prefixes");
  const extension = visibilityDrain(s, n.id, r.id);
  check(
    extension.values.length === 257 && extension.values.every((v) => v.startsWith("2:")),
    "extension starts at checked predecessor count",
  );
  const first = visibilityQuery(s, r.id);
  const second = visibilityQuery(s, n.id, r.id);
  check(!first.done && !second.done, "two positive pending cursors");
  check(visibilityQuery(s, n.id).code === "capacity", "third cursor capacity");
  check(
    visibilityQuery({ ...s, owner: s.owner + 1n }, r.id, 0n, first.next).code === "stale-owner",
    "wrong owner",
  );
  check(
    visibilityQuery({ ...s, session: s.session + 1n }, r.id, 0n, first.next).code ===
      "stale-session",
    "wrong session",
  );
  check(
    visibilityQuery(s, n.id, 0n, first.next).code === "invalid",
    "tuple mismatch cannot hijack cursor",
  );
  const old = s;
  s = edit.panBegin(s, 2, 400, 400, false);
  s = edit.panUpdate(s, 1n, 1500, 420, false);
  check(visibilityQuery(old, r.id, 0n, first.next).code === "stale-scene", "request freshness");
  const continued = visibilityDrain(s, r.id, 0n, visibilityQuery(s, r.id, 0n, first.next));
  check(
    continued.values.length + first.strokes.length === 257 &&
      continued.values.every((v) => v.startsWith("1:")),
    "new scene continues captured view rather than moved viewport",
  );
  s = edit.cancel(s, "escape");
  frames.release(s, r.id);
  check(
    visibilityQuery(s, n.id, r.id, second.next).code === "stale-scene",
    "predecessor release retires dependent cursor",
  );
  const afterRelease = visibilityQuery(s, n.id);
  check(afterRelease.code === "ok" && !afterRelease.done, "released slots reusable");
  s = edit.undo(s);
  s = edit.undo(s, true);
  check(
    visibilityQuery(s, n.id, 0n, afterRelease.next).code === "stale-scene",
    "UndoRedo cannot resurrect invalid cursor",
  );
  const afterHistory = visibilityQuery(s, n.id);
  s = bridge.metrics(s, 2n, 1025, 768, 1);
  s = bridge.metrics(s, 3n, 1024, 768, 1);
  check(
    visibilityQuery(s, n.id, 0n, afterHistory.next).code === "stale-scene",
    "metrics roundtrip cannot resurrect cursor",
  );
  const display = captureDisplay(s);
  check(visibilityQuery(s, display.id).code === "invalid", "display authority rejected");
  s = queryReady(s);
  s = edit.begin(s, 4, 500, 500, 0.5, true);
  const anchor = captureLive(s, currentCoverage(s).activeSource);
  check(visibilityQuery(s, anchor.id).code === "invalid", "live authority rejected");
  s = edit.cancel(s, "escape");
  frames.release(s, display.id);
  frames.release(s, anchor.id);
  frames.release(s, n.id);
  closeTailFixture(s);
  return { ...report(), extensionChunks: extension.values.length };
}
