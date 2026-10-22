import { bridge } from "../../../src/memory/bridge.ts";
import { edit } from "../../../src/memory/edit-bridge.ts";
import { frames } from "../../../src/memory/frame-bridge.ts";
import { live } from "../../../src/memory/live-bridge.ts";
import { preparation } from "../../../src/memory/preparation-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { queryReady } from "./query-readiness.ts";

export function livePrefixBoundary() {
  let checks = 0;
  const check = (value: boolean, label: string) => {
    if (!value) throw Error(label);
    checks++;
  };
  for (const count of [1, 2, 3, 127, 128, 129]) {
    let s = bridge.create();
    s = queryReady(bridge.metrics(bridge.enter(s.owner), 1n, 1024, 768, 1));
    const frame = frames.capture(s);
    check(frame.code === "ok", "frame");
    s = edit.begin(s, 1, 300, 300, 0.5, true);
    if (count > 1)
      s = edit.append(
        s,
        1n,
        Float64Array.from({ length: count - 1 }, (_, i) => 301 + i),
        new Float64Array(count - 1).fill(310),
        new Float64Array(count - 1).fill(0.6),
        new Uint8Array(count - 1).fill(1),
      );
    check(s.code === "ok", "source");
    const id = scene.ids(s, 0n).ids[0];
    if (id === undefined) throw Error("stroke");
    const stable = live.stable(s, id, 0n, 1, frame.id);
    const tail = live.tail(s, id, stable.through, 1, frame.id);
    const limit = BigInt(Math.floor((count - 1) / 128) * 128);
    check(stable.code === "ok" && stable.through === limit, "canonical prefix");
    check(stable.points.length <= 132 * 3, "bounded source");
    check((limit === 0n) === (stable.token === 0n), "partial chunk remains mutable");
    check(tail.code === "ok" && tail.through === BigInt(count), "terminal tail");
    s = edit.append(
      s,
      BigInt(count),
      new Float64Array([500]),
      new Float64Array([400]),
      new Float64Array([0.7]),
      new Uint8Array([1]),
    );
    check(s.code === "ok", "append while preparation pending");
    if (stable.token)
      check(preparation.current(s, stable.token) === "ok", "immutable ticket survives append");
    check(preparation.current(s, tail.token) !== "ok", "exact tail rejects append");
    s = edit.end(s, BigInt(count + 1));
    check(s.code === "ok", "end");
    const terminal = live.stable(s, id, BigInt(count), 1, frame.id);
    check(terminal.code === "ok" && terminal.through === BigInt(count + 1), "end stabilizes tail");
    for (const input of [stable, tail, terminal])
      if (input.token) preparation.release(s, input.token);
    frames.release(s, frame.id);
    bridge.leave(s);
    bridge.dispose(s.owner);
  }
  return { checks, evidence: "generated typed browser boundary fixture; not actual-route E2E" };
}
