import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { queryReady } from "./query-readiness.ts";

export function historyDisplayBoundary() {
  let s = bridge.create();
  s = bridge.enter(s.owner);
  s = queryReady(bridge.metrics(s, 1n, 1024, 768, 1));
  s = edit.begin(s, 1, 300, 300, 0, false);
  if (s.code !== "ok") throw Error(`begin: ${s.code}`);
  s = edit.end(s, 1n);
  if (s.code !== "ok") throw Error(`end: ${s.code}`);
  const frame = frames.capture(s);
  if (frame.code !== "ok") throw Error("capture");
  s = edit.undo(s);
  if (s.code !== "ok") throw Error(`undo: ${s.code}`);
  const before = bridge.read(s.owner);
  let checks = 0;
  const check = (value: boolean, label: string) => {
    if (!value) throw Error(label);
    checks++;
  };
  check(frames.displayTransform(s, frame.id).code === "ok", "historical mapping only");
  check(frames.transform(s, frame.id).code === "stale-scene", "strict transform rejects");
  check(frames.ready(s, frame.id).code === "stale-scene", "current readiness rejects");
  check(
    frames.preparation(s, frame.through, 0n, 1n, 1, frame.id).code === "stale-scene",
    "strict preparation rejects",
  );
  for (const altered of [
    { ...s, owner: s.owner + 1n },
    { ...s, session: s.session + 1n },
    { ...s, mapping: s.mapping + 1n },
  ])
    check(frames.displayTransform(altered, frame.id).code !== "ok", "authority mismatch");
  check(frames.displayTransform(s, frame.id + 1000n).code !== "ok", "unknown receipt");
  const after = bridge.read(s.owner);
  check(
    before.content === after.content &&
      before.strokeCount === after.strokeCount &&
      before.canUndo === after.canUndo &&
      before.canRedo === after.canRedo,
    "queries do not mutate content or history",
  );
  s = bridge.metrics(s, 2n, 1025, 768, 1);
  check(frames.displayTransform(s, frame.id).code === "stale-mapping", "metrics invalidate");
  frames.release(s, frame.id);
  check(frames.displayTransform(s, frame.id).code !== "ok", "released receipt");
  bridge.leave(s);
  check(frames.displayTransform(s, frame.id).code !== "ok", "departed session");
  bridge.dispose(s.owner);
  return { checks, evidence: "generated typed browser boundary fixture; not actual-route E2E" };
}
