import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { live } from "../../../src/memory/live-bridge.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { tail } from "../../../src/memory/tail-bridge.ts";
import {
  tailFixture,
  appendTailPoints,
  assertions,
  completeTailRange,
  closeTailFixture,
} from "./tail-fixture.ts";
export async function tailBoundary() {
  const { check, report } = assertions();
  const f = tailFixture();
  let s = f.state;
  const a = tail.capture(s, f.stroke, f.frame, 0n, 1);
  const b = tail.capture(s, f.stroke, f.frame, 0n, 1);
  check(a.code === "ok" && b.code === "ok", "two display descriptors");
  check(tail.capture(s, f.stroke, f.frame, 0n, 1).code === "capacity", "third descriptor rejected");
  for (const altered of [
    { ...s, owner: s.owner + 1n },
    { ...s, session: s.session + 1n },
    { ...s, mapping: s.mapping + 1n },
  ])
    check(tail.status(altered, a.id).code !== "ok", "authority fence");
  const first = tail.prepare(s, a.id);
  check(first.points.length <= 132 * 3, "source bound");
  check(tail.prepare(s, a.id).code === "sequence", "one pending range");
  check(
    preparation.current(s, first.token) !== "ok" && !preparation.coverage(s, first.token),
    "display is never canonical",
  );
  check(!frames.coverage(s, first.token, f.frame), "display is never frame coverage");
  check(tail.complete(s, b.id, first.token, 0n) !== "ok", "wrong parent rejected");
  await completeTailRange(s, a.id, first, check);
  await completeTailRange(s, b.id, tail.prepare(s, b.id), check);
  const originalTerminal = tail.prepare(s, b.id);
  s = appendTailPoints(s, 129, 1);
  check(s.code === "ok", "append before captured terminal issuance");
  const capturedTerminal = tail.prepare(s, a.id);
  check(
    JSON.stringify([...capturedTerminal.points]) === JSON.stringify([...originalTerminal.points]),
    "captured terminal excludes later neighbor",
  );
  check(
    JSON.stringify([...capturedTerminal.parameters]) ===
      JSON.stringify([...originalTerminal.parameters]),
    "captured geometry parameters unchanged",
  );
  await completeTailRange(s, a.id, capturedTerminal, check);
  await completeTailRange(s, b.id, originalTerminal, check);
  check(
    tail.status(s, a.id).complete && !tail.status(s, a.id).exact,
    "old capture completes without current certification",
  );
  tail.release(s, b.id);
  tail.release(s, b.id);
  check(tail.status(s, b.id).code !== "ok", "released descriptor stays stale");
  s = edit.end(s, 130n);
  s = edit.panBegin(s, 2, 400, 400, false);
  s = edit.panUpdate(s, 1n, 450, 430, false);
  check(s.code === "ok", "accepted ended-source pan");
  check(
    [...tail.transform(s, a.id).matrix].some((v, i) => v !== [1, 0, 0, 1, 0, 0][i]),
    "camera actually changed",
  );
  check(tail.transform(s, a.id).code === "ok", "ended capture uses Rust camera transform");
  check(
    JSON.stringify([...tail.transform(s, a.id).matrix]) ===
      JSON.stringify([...frames.displayTransform(s, f.frame).matrix]),
    "all masks share fixed anchor",
  );
  s = edit.cancel(s, "escape");
  check(tail.status(s, a.id).code === "ok", "pan Escape preserves capture");
  s = edit.begin(s, 2, 600, 500, 0.6, true);
  s = edit.cancel(s, "escape");
  check(tail.status(s, a.id).code === "ok", "cancel D preserves ended C");
  s = edit.undo(s);
  check(tail.status(s, a.id).code !== "ok", "Undo invalidates");
  s = edit.undo(s, true);
  check(tail.status(s, a.id).code !== "ok", "Redo never resurrects");
  closeTailFixture(s);
  for (const firstFrames of [true, false]) {
    const c = tailFixture(1),
      ids = [c.frame];
    let state = c.state;
    if (firstFrames) for (let i = 0; i < 5; i++) ids.push(frames.capture(state).id);
    const tails = [
      tail.capture(state, c.stroke, c.frame, 0n, 1),
      tail.capture(state, c.stroke, c.frame, 0n, 1),
    ];
    if (!firstFrames) for (let i = 0; i < 5; i++) ids.push(frames.capture(state).id);
    check(
      ids.every((id) => id > 0n) && tails.every((t) => t.code === "ok"),
      "combined eight descriptors in either order",
    );
    check(frames.capture(state).code === "capacity", "ninth capture rejected");
    state = edit.end(state, 1n);
    check(
      live.append(state, ids[1]!, c.stroke).code === "capacity",
      "ninth append receipt rejected",
    );
    tail.release(state, tails[0]!.id);
    const empty = tail.capture(state, c.stroke, c.frame, 1n, 1);
    check(empty.code === "ok" && empty.complete && empty.exact, "empty ended tail");
    state = bridge.metrics(state, 2n, 1025, 768, 1);
    check(tail.status(state, empty.id).code !== "ok", "metrics invalidation");
    closeTailFixture(state);
  }
  return report();
}
