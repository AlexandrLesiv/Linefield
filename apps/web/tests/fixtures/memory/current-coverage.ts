import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { live } from "../../../src/memory/live-bridge.ts";
import {
  currentCoverage,
  captureLive,
  captureDisplay,
} from "../../../src/memory/current-coverage.ts";
import { tail } from "../../../src/memory/tail-bridge.ts";
import { queryReady } from "./query-readiness.ts";
import { assertions, closeTailFixture } from "./tail-fixture.ts";
export function coverageBoundary() {
  const { check, report } = assertions();
  let s = bridge.create();
  s = queryReady(bridge.metrics(bridge.enter(s.owner), 1n, 1024, 768, 1));
  const prefix = frames.capture(s);
  const display = captureDisplay(s);
  check(prefix.code === "ok" && display.code === "ok", "prefix and display captures");
  let q = currentCoverage(s, 0n, prefix.id, prefix.id);
  check(q.code === "ok" && q.liveState === "none" && q.candidateExactView, "empty current prefix");
  check(frames.transform(s, display.id).code === "invalid", "display not strict prefix");
  check(frames.ready(s, display.id).code === "invalid", "display cannot certify readiness");
  check(currentCoverage(s, 0n, display.id).code === "invalid", "wrong installed authority");
  check(currentCoverage(s, 0n, 0n, display.id).code === "invalid", "wrong candidate authority");
  check(currentCoverage(s, display.id).code === "invalid", "wrong live authority");
  check(currentCoverage(s, 999n).liveState === "obsolete", "unknown live does not infer source");
  check(currentCoverage(s, 0n, 999n).code === "stale-scene", "unknown installed rejects");
  for (const altered of [
    { ...s, owner: s.owner + 1n },
    { ...s, session: s.session + 1n },
    { ...s, mapping: s.mapping + 1n },
  ]) {
    check(currentCoverage(altered).code !== "ok", "query authority fence");
    check(captureDisplay(altered).code !== "ok", "display capture authority fence");
  }
  s = edit.begin(s, 1, 300, 300, 0.5, true);
  q = currentCoverage(s);
  const source = q.activeSource;
  check(source > 0n && q.activeCount === 1n, "active identity");
  check(captureLive(s, source + 1n).code !== "ok", "wrong active capture source");
  check(currentCoverage(s).activeSource === source, "wrong capture preserves active input");
  const anchor = captureLive(s, source);
  check(anchor.code === "ok" && anchor.ordinal === 0n, "independent live anchor");
  check(frames.transform(s, anchor.id).code === "invalid", "live not strict prefix");
  check(live.stable(s, source, 0n, 1, prefix.id).code === "invalid", "prefix not live authority");
  check(live.stable(s, source, 0n, 1, display.id).code === "invalid", "display not live authority");
  q = currentCoverage(s, anchor.id, prefix.id, prefix.id);
  check(
    q.liveState === "active" && q.liveCount === 1n && q.nextSource === 0n,
    "active never candidate next",
  );
  const front = tail.capture(s, source, anchor.id, 0n, 1);
  check(front.code === "ok", "live tail parent");
  s = edit.end(s, 1n);
  q = currentCoverage(s, anchor.id, prefix.id, prefix.id);
  check(
    q.liveState === "ended" && q.nextSource === source && q.nextCount === 1n,
    "ended ordered successor",
  );
  const successor = live.append(s, prefix.id, source);
  check(successor.code === "ok", "immutable next prefix");
  q = currentCoverage(s, anchor.id, successor.id, successor.id);
  check(
    q.liveState === "included" && q.candidateIncludesLive && q.candidateExactView,
    "checked inclusion",
  );
  check(live.append(s, successor.id, source).code !== "ok", "no repeated composite authority");
  s = edit.panBegin(s, 2, 400, 400, false);
  s = edit.panUpdate(s, 1n, 450, 430, false);
  q = currentCoverage(s, anchor.id, successor.id, successor.id);
  check(q.viewGestureActive && !q.canFold && !q.candidateViewCurrent, "cancellable camera fact");
  check(captureDisplay(s).code === "active", "no gesture reanchor");
  check(tail.status(s, front.id).code === "ok", "live parent survives view motion");
  s = edit.cancel(s, "escape");
  q = currentCoverage(s, anchor.id, successor.id, successor.id);
  check(
    q.candidateRecaptureSafe && !q.candidateExactView,
    "restored source/view needs new mapping certificate",
  );
  s = edit.begin(s, 3, 600, 500, 0.5, true);
  const d = captureLive(s, currentCoverage(s).activeSource);
  s = edit.cancel(s, "escape");
  check(currentCoverage(s, d.id).liveState === "obsolete", "cancel permanently invalidates D");
  check(currentCoverage(s, anchor.id).liveState === "ended", "cancel D preserves C");
  s = edit.undo(s);
  check(currentCoverage(s, anchor.id).liveState === "obsolete", "Undo invalidates C anchor");
  check(
    !currentCoverage(s, 0n, successor.id, successor.id).candidateValid,
    "obsolete prefix rejected",
  );
  s = edit.undo(s, true);
  check(currentCoverage(s, anchor.id).liveState === "obsolete", "Redo cannot resurrect C anchor");
  q = currentCoverage(s, 0n, 0n, successor.id);
  check(
    q.candidateRecaptureSafe && q.nextSource === 0n && !q.candidateExactView,
    "no-next history recapture",
  );
  frames.release(s, display.id);
  check(frames.displayTransform(s, display.id).code === "stale-scene", "released display stale");
  s = bridge.metrics(s, 2n, 1025, 768, 1);
  check(frames.displayTransform(s, prefix.id).code === "stale-mapping", "metrics fence old raster");
  closeTailFixture(s);
  return report();
}
