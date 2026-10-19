import { diagnosticSnapshot } from "../../src/memory/diagnostics.ts";
import * as api from "#memory-bindings";
import { bridge } from "../../src/memory/bridge.ts";
import type { ReplyValue } from "../../src/memory/bridge.ts";
function check(condition: boolean, label: string): void {
  if (!condition) throw Error(label);
}
function throws(action: () => unknown, message: string): void {
  let caught: unknown;
  try {
    action();
  } catch (error: unknown) {
    caught = error;
  }
  check(caught === message, message);
}
function raw(action: unknown, arguments_: unknown[]): ReplyValue {
  if (typeof action !== "function") throw Error("missing named export");
  const value: unknown = Reflect.apply(action, undefined, arguments_);
  if (!(value instanceof api.Reply)) throw Error("invalid snapshot class");
  try {
    return {
      code: value.code,
      owner: value.owner,
      session: value.session,
      interaction: value.interaction,
      mapping: value.mapping,
      presentation: value.presentation,
      content: value.content,
      scene: value.scene,
      activeCancelled: value.activeCancelled,
    };
  } finally {
    value.free();
  }
}
export function boundaryMatrix() {
  const cases: string[] = [];
  const reserved = api.memoryCreate();
  const owner = reserved.owner;
  throws(() => api.memoryEnter(owner), "boundary-capacity");
  reserved.free();
  check(bridge.read(owner).phase === "gallery", "reservation before mutation");
  cases.push("one-live-snapshot-before-mutation");
  let accessors = 0;
  const hostile = {
    valueOf: () => {
      accessors += 1;
      return 1;
    },
    toString: () => {
      accessors += 1;
      return "1";
    },
  };
  for (const value of [
    1,
    -1n,
    1n << 64n,
    "1",
    null,
    hostile,
    new Proxy(
      {},
      {
        get: () => {
          accessors += 1;
          throw Error("getter");
        },
      },
    ),
  ]) {
    check(raw(api.memoryEnter, [value]).code === "invalid", "hostile owner rejection");
  }
  check(accessors === 0, "no object coercion");
  cases.push("hostile-u64-kind-range-no-coercion");
  let state = bridge.enter(owner);
  const before = state;
  for (const value of [NaN, Infinity, -1, 0, 8193, "100", hostile]) {
    check(
      raw(api.memoryMetrics, [owner, state.session, state.mapping, 1n, value, 100, 1]).code ===
        "invalid",
      "invalid metrics",
    );
  }
  check(bridge.read(owner).mapping === before.mapping && accessors === 0, "atomic invalid metrics");
  state = bridge.metrics(state, 1n, 1024, 768, 1);
  check(state.code === "ok" && !bridge.read(owner).canBeginInk, "unpresented guard");
  const old = state;
  check(
    bridge.presented(state).code === "ok" && bridge.read(owner).canBeginInk,
    "exact acknowledgement",
  );
  state = bridge.suspend(state, 2n);
  check(bridge.presented(state).code === "unavailable", "suspended acknowledgement cannot resume");
  state = bridge.metrics(state, 3n, 1024, 768, 1);
  check(state.presentation !== old.presentation, "same-size token fresh");
  check(
    bridge.presented(old).code !== "ok" && !bridge.read(owner).canBeginInk,
    "old frame rejected",
  );
  check(bridge.presented(state).code === "ok", "new frame accepted");
  cases.push("same-size-suspend-old-frame-new-frame");
  const page = api.memorySceneIds(owner, state.session, state.scene, 0n);
  const ids = page.ids;
  throws(() => page.ids, "snapshot-consumed");
  page.free();
  check(ids.length === 0, "copied empty IDs survive release");
  cases.push("scene-output-copy-one-shot-release");
  bridge.leave(state);
  const resumed = bridge.enter(owner);
  check(
    resumed.session !== state.session && bridge.presented(state).code === "stale-session",
    "old attachment rejected",
  );
  bridge.dispose(owner);
  const replacement = bridge.create();
  check(bridge.presented(resumed).code === "disposed", "disposed frame rejected");
  check(
    bridge.dispose(owner).code === "disposed" && bridge.read(replacement.owner).code === "ok",
    "old disposal preserves replacement",
  );
  cases.push("dispose-new-owner-old-callback");
  state = bridge.enter(replacement.owner);
  state = bridge.metrics(state, 1n, 1024, 768, 1);
  check(
    bridge.metrics(state, (1n << 64n) - 1n, 1024, 768, 1).code === "exhausted",
    "sequence exhaustion",
  );
  state = bridge.read(replacement.owner);
  check(
    state.session !== 0n && !bridge.read(replacement.owner).canBeginInk,
    "sequence fails closed",
  );
  check(bridge.leave(state).code === "ok", "sequence exhaustion cleanup");
  for (let index = 0; index < 150; index++) bridge.read(replacement.owner);
  const log = diagnosticSnapshot();
  check(log.records.length === 100 && log.dropped > 0, "bounded diagnostics");
  for (const event of log.records) {
    check(
      Object.keys(event).sort().join() === "command,event,outcome,request,session,time",
      "allowlisted diagnostic fields",
    );
    check(
      event.event === "memory-command" && /^\d+$/.test(event.session),
      "diagnostic metadata only",
    );
  }
  cases.push("diagnostic-redaction-bounded-overload");
  bridge.dispose(replacement.owner);
  const seed: unknown = Reflect.get(api, "fixtureNearExhaustion");
  if (typeof seed !== "function") throw Error("fixture feature missing");
  seed();
  const near = bridge.create();
  state = bridge.enter(near.owner);
  state = bridge.metrics(state, 1n, 1024, 768, 1);
  state = bridge.metrics(state, 2n, 1025, 768, 1);
  check(state.code === "exhausted", "generation terminal admission");
  check(bridge.leave(state).code === "ok", "reserved leave");
  check(bridge.enter(near.owner).code === "exhausted", "never wrap or reuse");
  bridge.dispose(near.owner);
  cases.push("sequence-and-generation-exhaustion-preserves-cleanup");
  return { cases, accessors, count: cases.length };
}
