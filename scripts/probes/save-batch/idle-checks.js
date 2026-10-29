import { ink, snapshot, equal } from "./fixture.js";
import { collect, stage } from "./incremental.js";
import { idleBoundary, abandonCapturedSource } from "./idle-boundary.js";
const pause = () => new Promise((resolve) => setTimeout(resolve, 0));
export async function finishIdle(engine, token, budget = 64) {
  let calls = 0;
  for (;;) {
    const status = engine.idle_step(token, budget);
    calls++;
    if (status === 2) return calls;
    if (status !== 1 || calls > 100001) throw Error("idle preparation rejected");
    if (calls % 32 === 0) await pause();
  }
}
export async function cleanupIdle(engine, budget = 64) {
  let calls = 0;
  for (;;) {
    const status = engine.idle_cleanup(budget) >>> 0;
    calls++;
    if (status === 0) return calls;
    if (status !== 1 || calls > 110000) throw Error("idle cleanup rejected");
    if (calls % 32 === 0) await pause();
  }
}
export async function idleChecks(load) {
  const checks = [],
    check = (name, ok) => {
      if (!ok) throw Error(name);
      checks.push(name);
    };
  const legacy = await load(),
    e = await load();
  // Cross both the source-descriptor and pending-body chunk boundaries.
  for (let i = 0; i < 9000; i++) {
    ink(legacy, 1, i);
    ink(e, 1, i);
    if (i % 1000 === 0) await pause();
  }
  const old = legacy.delta_prepare(),
    base = legacy.delta_base(old),
    result = legacy.delta_target(old);
  const expected = collect(legacy, old),
    token = e.idle_begin();
  check(
    "bounded begin freezes completed revision without durability",
    token > 0 &&
      e.idle_status() === 1 &&
      e.idle_base(token) === base &&
      e.idle_target(token) === result &&
      e.delta_durable() === 0n,
  );
  check(
    "unsealed payload and acknowledgement unavailable",
    e.idle_stream_count(token) === 0 &&
      e.idle_chunk(token, 0, 0) >>> 0 === 0xffffffff &&
      e.idle_ack(token, base, result) === 0,
  );
  check(
    "stale token and invalid preparation budgets rejected",
    e.idle_step(token + 1, 1) === 0 && e.idle_step(token, 0) === 0 && e.idle_step(token, 65) === 0,
  );
  check(
    "one preparation unit does not scan all sources",
    e.idle_step(token, 1) === 1 && e.idle_status() === 1,
  );
  ink(e, 3, 123);
  check("legacy prepare blocked while idle owns revision N", e.delta_prepare() === 0);
  const beforeRestore = snapshot(e),
    session = stage(e, [{ streams: expected, base, result }]);
  check(
    "restore publication blocked while idle owns work",
    e.restore_publish(session) === 0 && equal(beforeRestore, snapshot(e)),
  );
  const prepareCalls = await finishIdle(e, token);
  const captured = collect(idleBoundary(e), token);
  check(
    "virtual metadata and sources exactly match legacy bytes after N+1",
    equal(expected, captured),
  );
  check(
    "wrong receipt cannot advance durability",
    e.idle_ack(token, base, result + 1n) === 0 && e.delta_durable() === 0n,
  );
  check(
    "matching receipt advances N only",
    e.idle_ack(token, base, result) === 1 &&
      e.delta_durable() === result &&
      e.delta_revision() === result + 1n &&
      e.idle_status() === 4,
  );
  check(
    "retirement does not run inside acknowledgement",
    e.idle_status() === 4 && e.idle_cleanup(0) >>> 0 === 0xffffffff && e.idle_status() === 4,
  );
  check("legacy prepare blocked during retirement", e.delta_prepare() === 0);
  check("restore publication also blocked during retirement", e.restore_publish(session) === 0);
  const next = e.idle_begin(),
    nextBase = e.idle_base(next),
    nextResult = e.idle_target(next);
  await finishIdle(e, next);
  check(
    "old token cannot read or acknowledge a newer batch",
    e.idle_chunk(token, 0, 0) >>> 0 === 0xffffffff && e.idle_ack(token, base, result) === 0,
  );
  check(
    "second acknowledgement waits for bounded retirement slot",
    e.idle_ack(next, nextBase, nextResult) === 0 && e.delta_durable() === result,
  );
  const nextBytes = collect(idleBoundary(e), next),
    retiredCalls = await cleanupIdle(e, 1);
  check(
    "many tiny sources require bounded cleanup calls",
    retiredCalls === 9000 + Math.ceil(9000 / 256) + 1,
  );
  check(
    "cleanup preserves uncommitted newer batch",
    equal(nextBytes, collect(idleBoundary(e), next)) && e.delta_durable() === result,
  );
  check(
    "busy acknowledgement retries after retirement",
    e.idle_ack(next, nextBase, nextResult) === 1 && e.delta_durable() === nextResult,
  );
  await cleanupIdle(e);
  check("cleanup leaves accepted editor state intact", equal(beforeRestore, snapshot(e)));
  ink(e, 1, 500);
  const compatible = e.delta_prepare();
  ink(e, 1, 501);
  check(
    "legacy checkpoint remains available when idle owns nothing",
    compatible > 0 && e.idle_begin() === 0,
  );
  legacy.delta_ack(old, base, result);
  const large = await load();
  ink(large, 1000000);
  const largeToken = large.idle_begin();
  await finishIdle(large, largeToken);
  abandonCapturedSource(large);
  check(
    "real undo and branch discard remove editor source owner",
    large.raw_length(0) === 0 && large.delta_revision() === 3n,
  );
  check(
    "large abandoned source acknowledges without destruction",
    large.idle_ack(largeToken, 0n, 1n) === 1 && large.idle_status() === 4,
  );
  const largeCleanupCalls = await cleanupIdle(large, 1);
  check(
    "last Rc million-sample source destroyed block by block",
    largeCleanupCalls === Math.ceil(1000000 / 256) + 4 &&
      large.delta_durable() === 1n &&
      large.delta_revision() === 3n,
  );
  return { checks, prepareCalls, retiredCalls, largeCleanupCalls };
}
