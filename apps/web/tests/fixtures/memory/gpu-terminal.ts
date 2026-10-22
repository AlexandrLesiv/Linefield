import { queryReady } from "./query-readiness.ts";
import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take, copyReply } from "../../../src/memory/edit-bridge.ts";
function check(v: boolean, label: string) {
  if (!v) throw Error(label);
}
export function terminalReserve() {
  let s = bridge.create();
  s = bridge.enter(s.owner);
  s = bridge.metrics(s, 1n, 1024, 768, 1);
  s = queryReady(s);
  s = edit.panBegin(s, 3, 200, 200, false);
  check(s.code === "ok", "pan begins");
  s = edit.panUpdate(s, 1n, 240, 260, false);
  check(s.code === "ok", "pan moves");
  const fault: unknown = Reflect.get(api, "fixtureTerminalReserve");
  if (typeof fault !== "function") throw Error("fixture missing");
  const value: unknown = fault();
  if (!(value instanceof api.Reply)) throw Error("fixture reply");
  s = take(() => value, copyReply);
  check(s.code === "ok", "fault armed");
  s = bridge.metrics(s, 2n, 1025, 768, 1);
  check(
    s.code === "exhausted" && s.interaction === 0n && s.activeCancelled,
    "cancel and suspend reserved",
  );
  s = bridge.suspend(s, 3n);
  check(s.code === "noop", "already suspended");
  s = bridge.leave(s);
  check(s.code === "ok", "terminal leave");
  check(bridge.enter(s.owner).code === "exhausted", "no wrap");
  bridge.dispose(s.owner);
  return {
    case: "active pan → near-exhaustion → changed metrics → suspend → leave",
    status: "passed",
  };
}
