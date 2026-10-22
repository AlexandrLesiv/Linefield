import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import {
  currentCoverage,
  captureLive,
  captureDisplay,
} from "../../../src/memory/current-coverage.ts";
import { tail } from "../../../src/memory/tail-bridge.ts";
import { tailFixture, assertions, closeTailFixture } from "./tail-fixture.ts";
export function coverageLifetime() {
  const { check, report } = assertions();
  for (const tailsFirst of [false, true]) {
    const f = tailFixture(1),
      s = f.state;
    const prefixes: bigint[] = [];
    const addPrefixes = () => {
      for (let i = 0; i < 5; i++) {
        const p = frames.capture(s);
        check(p.code === "ok", "bounded prefix allocation");
        prefixes.push(p.id);
      }
    };
    if (!tailsFirst) addPrefixes();
    const a = tail.capture(s, f.stroke, f.frame, 0n, 1);
    const b = tail.capture(s, f.stroke, f.frame, 0n, 1);
    check(a.code === "ok" && b.code === "ok", "two tails share live anchor");
    if (tailsFirst) addPrefixes();
    check(captureLive(s, f.stroke).code === "capacity", "ninth live allocation rejected");
    check(captureDisplay(s).code === "capacity", "ninth display allocation rejected");
    check(frames.capture(s).code === "capacity", "ninth prefix allocation rejected");
    frames.release(s, f.frame);
    check(tail.status(s, a.id).code === "stale-scene", "parent-first release fences tail");
    check(currentCoverage(s, f.frame).liveState === "obsolete", "released live stays obsolete");
    check(frames.capture(s).code === "ok", "released parent frees exactly one slot");
    check(frames.capture(s).code === "capacity", "orphan tails remain charged");
    tail.release(s, a.id);
    check(captureDisplay(s).code === "ok", "explicit child release frees charge");
    check(captureDisplay(s).code === "capacity", "still bounded after transfer");
    closeTailFixture(s);
  }
  const f = tailFixture(1);
  let s = f.state;
  const query = api.memoryCurrentCoverage(s.owner, s.session, s.mapping, f.frame, 0n, 0n);
  check(query.code === "ok" && query.liveState === "active", "one checked query wrapper");
  let rejected = false;
  try {
    api.memoryDisplayFrameCapture(s.owner, s.session, s.mapping);
  } catch {
    rejected = true;
  }
  check(rejected, "outstanding wrapper prevents capture");
  query.free();
  const next = captureDisplay(s);
  check(next.code === "ok", "free restores wrapper admission");
  const malformed = Reflect.apply(api.memoryCurrentCoverage, undefined, [
    Number(s.owner),
    s.session,
    s.mapping,
    0n,
    0n,
    0n,
  ]);
  if (!(malformed instanceof api.CurrentCoverageSnapshot)) throw Error("typed snapshot");
  check(malformed.code === "invalid", "number is not a bigint ID");
  malformed.free();
  s = edit.append(
    s,
    1n,
    new Float64Array([Number.NaN]),
    new Float64Array([1]),
    new Float64Array([0.5]),
    new Uint8Array([1]),
  );
  check(s.activeCancelled, "malformed-current input cancels only its source");
  check(
    currentCoverage(s, f.frame).liveState === "obsolete",
    "malformed cancellation permanently fences anchor",
  );
  s = edit.begin(s, 2, 400, 400, 0.5, true);
  const fresh = captureLive(s, currentCoverage(s).activeSource);
  check(fresh.code === "ok", "fresh source admitted");
  s = bridge.metrics(s, 2n, 1025, 768, 1);
  s = bridge.metrics(s, 3n, 1024, 768, 1);
  check(currentCoverage(s, fresh.id).liveState === "obsolete", "metric roundtrip never resurrects");
  closeTailFixture(s);
  return report();
}
