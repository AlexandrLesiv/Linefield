import * as api from "#memory-bindings";
import { bridge } from "../../../src/memory/bridge.ts";
import { edit, take, copyReply } from "../../../src/memory/edit-bridge.ts";
import { scene } from "../../../src/memory/scene-bridge.ts";
import { queryReady } from "./query-readiness.ts";

export function pageJoins() {
  const seed: unknown = Reflect.get(api, "fixtureFarView");
  if (typeof seed !== "function") throw Error("fixture missing");
  let joins = 0,
    pages = 0,
    maximumError = 0;
  for (const region of [0n, 9223372036854775800n, -9223372036854775800n]) {
    const result: unknown = seed(region, 65535.875);
    if (!(result instanceof api.Reply) || take(() => result, copyReply).code !== "ok")
      throw Error("seed");
    let s = bridge.create();
    s = bridge.enter(s.owner);
    s = queryReady(bridge.metrics(s, 1n, 512, 512, 4));
    s = edit.view(s, 0.05, 256, 256, false);
    s = edit.begin(s, 1, 400, 300, 0.5, true);
    s = edit.append(
      s,
      1n,
      new Float64Array([300, 200, 100]),
      new Float64Array([220, 180, 200]),
      new Float64Array([0.5, 0.5, 0.5]),
      new Uint8Array([1, 1, 1]),
    );
    if (s.code !== "ok") throw Error("source");
    s = edit.end(s, 4n);
    const id = scene.ids(s, 0n).ids[0];
    if (id === undefined) throw Error("stroke");
    let cursor = 0n;
    let previous: readonly [number, number] = [1600, 1200];
    for (;;) {
      const page = scene.page(s, id, 4n, 0n, 64, cursor);
      if (page.code !== "ok" || !page.data.length || page.data.length > 6144) throw Error("page");
      const placement = scene.placement(s, id, page.page);
      if (placement.code !== "ok" || !placement.available) throw Error("placement");
      const m = placement.matrix;
      const projected = (i: number): readonly [number, number] => [
        (m[0] ?? NaN) * (page.data[i] ?? NaN) +
          (m[2] ?? NaN) * (page.data[i + 1] ?? NaN) +
          (m[4] ?? NaN),
        (m[1] ?? NaN) * (page.data[i] ?? NaN) +
          (m[3] ?? NaN) * (page.data[i + 1] ?? NaN) +
          (m[5] ?? NaN),
      ];
      for (let i = 0; i < page.data.length; i += 6) {
        const first = projected(i);
        maximumError = Math.max(
          maximumError,
          Math.hypot(first[0] - previous[0], first[1] - previous[1]),
        );
        previous = projected(i + 3);
        joins++;
      }
      scene.release(s, page.page);
      pages++;
      if (page.done) break;
      if (!page.next || page.next === cursor || pages >= 10000) throw Error("continuation");
      cursor = page.next;
    }
    maximumError = Math.max(maximumError, Math.hypot(previous[0] - 400, previous[1] - 800));
    bridge.leave(s);
    bridge.dispose(s.owner);
  }
  if (pages <= 3 || joins <= pages || !Number.isFinite(maximumError) || maximumError > 0.25)
    throw Error(`page continuity ${pages}/${joins}: ${maximumError}`);
  return {
    pages,
    joins,
    maximumError,
    scope: "synthetic checked-boundary page continuity and endpoints; no physical input claim",
  };
}
