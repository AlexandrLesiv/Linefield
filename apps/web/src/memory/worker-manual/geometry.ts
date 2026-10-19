import { bridge } from "../bridge.ts";
import type { ReplyValue } from "../bridge.ts";
import { penBridge } from "../pen-bridge.ts";
import { targetBridge } from "../render-target-bridge.ts";
import { sceneTarget } from "../scene-target.ts";
import type { PathPage } from "../path-page.ts";
import type { WorkerClient } from "./client.ts";
export class Superseded extends Error {}
function prefix(page: PathPage, count: number) {
  if (count > page.verbs.length || count < 0) throw Error("prefix-size");
  let points = 0,
    weights = 0,
    open = false;
  for (const verb of page.verbs.slice(0, count)) {
    if (verb === 0 && !open) {
      open = true;
      points += 2;
    } else if (verb === 1 && open) points += 2;
    else if (verb === 2 && open) {
      points += 4;
      weights++;
    } else if (verb === 3 && open) open = false;
    else throw Error("prefix-contour");
  }
  if (open) throw Error("prefix-open-contour");
  return {
    verbs: page.verbs.slice(0, count),
    points: page.points.slice(0, points),
    weights: page.weights.slice(0, weights),
  };
}
export async function transferGeometry(
  worker: WorkerClient,
  job: number,
  initial: ReplyValue,
  read: () => ReplyValue,
  valid: () => boolean,
  includeActive: boolean,
  target = 0n,
) {
  const current = () => {
    if (!valid()) throw new Superseded();
    return read();
  };
  const count = bridge.read(initial.owner).strokeCount;
  const terminal = target
    ? undefined
    : await sceneTarget(current, valid, 0n, count, initial.interaction);
  if (!target && !terminal) throw new Superseded();
  const limit = terminal
    ? includeActive && terminal.active
      ? terminal.active
      : terminal.terminal
    : undefined;
  const queries = target
    ? {
        stroke: (s: ReplyValue, id: bigint) => targetBridge.stroke(s, target, id),
        page: (s: ReplyValue, id: bigint, g: bigint, o: bigint) =>
          targetBridge.page(s, target, id, g, o),
      }
    : penBridge;
  await worker.request({ kind: "start", id: job });
  let after = 0n;
  for (;;) {
    const ids = target
      ? targetBridge.ids(current(), target, after)
      : bridge.scene(current(), after);
    if (ids.code !== "ok") throw new Superseded();
    for (const id of ids.ids) {
      if (limit !== undefined && id > limit) return;
      const stroke = queries.stroke(current(), id);
      if (stroke.code !== "ok") throw new Superseded();
      let offset = 0n;
      while (offset < stroke.verbs) {
        const page = queries.page(current(), id, stroke.geometry, offset);
        if (page.code !== "ok" || page.stroke !== id || page.geometry !== stroke.geometry)
          throw new Superseded();
        if (page.verbs.length === 0 && page.done) break;
        const remaining = stroke.verbs - offset;
        const copied = prefix(
          page,
          Number(remaining < BigInt(page.verbs.length) ? remaining : BigInt(page.verbs.length)),
        );
        offset += BigInt(copied.verbs.length);
        const done = offset === stroke.verbs;
        if (page.done && !done) throw Error("incomplete-prefix");
        await worker.request(
          { kind: "page", id: job, ...copied, color: [page.red, page.green, page.blue], done },
          [copied.verbs.buffer, copied.points.buffer, copied.weights.buffer],
        );
        if (done) break;
        if (offset !== page.next) throw Error("page-sequence");
      }
      after = id;
      if (limit !== undefined && id === limit) return;
    }
    if (ids.done) return;
    if (ids.ids.length === 0) throw Error("scene-sequence");
  }
}
