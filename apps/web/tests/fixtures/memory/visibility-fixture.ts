import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take, copyReply } from "../../../src/memory/edit-bridge.ts";
import { queryReady } from "./query-readiness.ts";
import type { ReplyValue } from "../../../src/memory/bridge.ts";
export function visibilityState() {
  const state = bridge.create();
  return queryReady(bridge.metrics(bridge.enter(state.owner), 1n, 1024, 768, 1));
}
export function visibilityStroke(state: ReplyValue, count: number, x = 300) {
  let s = edit.begin(state, 1, x, 300, 0.5, true);
  if (s.code !== "ok") throw Error(`fixture begin ${s.code}`);
  for (let first = 1; first < count; first += 256) {
    const length = Math.min(256, count - first);
    s = edit.append(
      s,
      BigInt(first),
      Float64Array.from({ length }, (_, i) => x + Math.sin((first + i) / 9) * 50),
      Float64Array.from({ length }, (_, i) => 300 + Math.cos((first + i) / 11) * 50),
      new Float64Array(length).fill(0.5),
      new Uint8Array(length).fill(1),
    );
    if (s.code !== "ok") throw Error(`fixture append ${s.code}`);
  }
  s = edit.end(s, BigInt(count));
  if (s.code !== "ok") throw Error(`fixture end ${s.code}`);
  return s;
}
export function visibilityQuery(s: ReplyValue, frame: bigint, predecessor = 0n, cursor = 0n) {
  return take(
    () => api.memoryFrameVisibility(s.owner, s.session, s.scene, frame, predecessor, cursor),
    (v) => ({
      code: v.code,
      next: v.next,
      done: v.done,
      strokes: [...v.strokes],
      chunks: [...v.chunks],
      revisions: [...v.revisions],
      visited: v.visitedNodes,
      hulls: v.constructedHulls,
      indexBytes: v.indexBytes,
      cursorBytes: v.cursorBytes,
      replyBytes: v.replyBytes,
    }),
  );
}
export function visibilityFault(limit: number, clear = false) {
  const fault: unknown = Reflect.get(api, "fixtureVisibilityLimit");
  if (typeof fault !== "function") throw Error("visibility fixture missing");
  const value: unknown = fault(limit, clear);
  if (!(value instanceof api.Reply)) throw Error("visibility fixture reply");
  return take(() => value, copyReply).code;
}
export function visibilityDrain(
  s: ReplyValue,
  frame: bigint,
  predecessor = 0n,
  first?: ReturnType<typeof visibilityQuery>,
) {
  const values: string[] = [];
  let page = first ?? visibilityQuery(s, frame, predecessor),
    visits = 0,
    hulls = 0,
    calls = 0;
  for (; calls < 2048; calls++) {
    if (
      page.code !== "ok" ||
      page.visited > 512 ||
      page.hulls > 4 ||
      page.strokes.length > 128 ||
      page.strokes.length !== page.chunks.length ||
      page.strokes.length !== page.revisions.length ||
      page.indexBytes > 8 * 1024 ** 2 ||
      page.cursorBytes > 16384 ||
      page.replyBytes > 3072
    )
      throw Error("visibility bounds or result");
    visits += page.visited;
    hulls += page.hulls;
    page.strokes.forEach((stroke, i) =>
      values.push(`${stroke}:${page.chunks[i]}:${page.revisions[i]}`),
    );
    if (page.done) {
      if (page.next !== 0n) throw Error("terminal cursor retained");
      return { values, visits, hulls, calls: calls + 1 };
    }
    if (page.next === 0n) throw Error("missing continuation");
    page = visibilityQuery(s, frame, predecessor, page.next);
  }
  throw Error("visibility fixture iteration bound");
}
