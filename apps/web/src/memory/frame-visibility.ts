import * as api from "#memory-bindings";
import { take } from "./edit-bridge.ts";
import { scene } from "./scene-bridge.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { ReplyValue } from "./bridge.ts";
type Page = { strokes: BigUint64Array; chunks: BigUint64Array; revisions: BigUint64Array };
type Result =
  | { kind: "progress" }
  | { kind: "done" }
  | {
      kind: "chunk";
      stroke: bigint;
      count: bigint;
      chunk: bigint;
    };
const empty = (): Page => ({
  strokes: new BigUint64Array(),
  chunks: new BigUint64Array(),
  revisions: new BigUint64Array(),
});
export class FrameVisibility {
  private page = empty();
  private offset = 0;
  private cursor = 0n;
  private done = false;
  private fallback = false;
  private ids: BigUint64Array = new BigUint64Array();
  private idOffset = 0;
  private idsDone = false;
  private scanStroke: { id: bigint; count: bigint; chunk: bigint } | undefined;
  private charge = 0;
  private state: () => ReplyValue;
  private frame: bigint;
  private predecessor: bigint;
  private through: bigint;
  private after: bigint;
  constructor(
    state: () => ReplyValue,
    frame: bigint,
    predecessor: bigint,
    through: bigint,
    after: bigint,
  ) {
    this.state = state;
    this.frame = frame;
    this.predecessor = predecessor;
    this.through = through;
    this.after = after;
  }
  private account() {
    metrics.visibilityBytes -= this.charge;
    this.charge =
      this.page.strokes.buffer.byteLength +
      this.page.chunks.buffer.byteLength +
      this.page.revisions.buffer.byteLength +
      this.ids.buffer.byteLength;
    metrics.visibilityBytes += this.charge;
  }
  next(group = 0n, revision = 0n): Result {
    if (this.offset < this.page.strokes.length) {
      const stroke = this.page.strokes[this.offset],
        count = this.page.revisions[this.offset],
        chunk = this.page.chunks[this.offset];
      if (stroke === undefined || count === undefined || chunk === undefined)
        throw Error("visibility-page");
      // Leave the next group's row owned and charged by this page until the
      // current painter-order queue drains. No sliced backing escapes next().
      if (group && group !== stroke) return { kind: "done" };
      if (group && revision !== count) throw Error("visibility-revision");
      this.offset++;
      return { kind: "chunk", stroke, count, chunk };
    }
    if (this.done) return { kind: "done" };
    if (this.fallback) return this.scan();
    const s = this.state();
    const value = take(
      () =>
        api.memoryFrameVisibility(
          s.owner,
          s.session,
          s.scene,
          this.frame,
          this.predecessor,
          this.cursor,
        ),
      (v) => ({
        code: v.code,
        next: v.next,
        done: v.done,
        strokes: v.strokes,
        chunks: v.chunks,
        revisions: v.revisions,
        visited: v.visitedNodes,
        hulls: v.constructedHulls,
        indexBytes: v.indexBytes,
        cursorBytes: v.cursorBytes,
        replyBytes: v.replyBytes,
      }),
    );
    if (value.code === "capacity" && this.cursor === 0n) {
      this.fallback = true;
      return { kind: "progress" };
    }
    if (value.code !== "ok") throw Error(value.code);
    metrics.visibilityQueries++;
    metrics.visibilityVisits += value.visited;
    metrics.visibilityHulls += value.hulls;
    metrics.visibilityMaxVisits = Math.max(metrics.visibilityMaxVisits, value.visited);
    metrics.visibilityMaxHulls = Math.max(metrics.visibilityMaxHulls, value.hulls);
    if (
      value.strokes.length !== value.chunks.length ||
      value.strokes.length !== value.revisions.length ||
      value.strokes.length > 128
    )
      throw Error("visibility-page");
    this.page = value;
    this.offset = 0;
    this.cursor = value.next;
    this.done = value.done;
    this.account();
    return { kind: "progress" };
  }
  private scan(): Result {
    if (this.scanStroke) {
      const source = this.scanStroke;
      const end = (source.count + 127n) / 128n;
      const count = Number(end - source.chunk > 128n ? 128n : end - source.chunk);
      const chunks = new BigUint64Array(count);
      for (let i = 0; i < count; i++) chunks[i] = source.chunk++;
      this.page = {
        strokes: new BigUint64Array(count).fill(source.id),
        revisions: new BigUint64Array(count).fill(source.count),
        chunks,
      };
      this.offset = 0;
      this.account();
      if (source.chunk === end) this.scanStroke = undefined;
      return { kind: "progress" };
    }
    if (this.idOffset < this.ids.length) {
      const id = this.ids[this.idOffset++];
      if (id === undefined || id > this.through) {
        this.done = true;
        return { kind: "done" };
      }
      const source = scene.stroke(this.state(), id);
      if (source.code !== "ok") throw Error(source.code);
      this.after = id;
      this.scanStroke = { id, count: source.count, chunk: 0n };
      return { kind: "progress" };
    }
    if (this.idsDone || this.after >= this.through) {
      this.done = true;
      return { kind: "done" };
    }
    const ids = scene.ids(this.state(), this.after);
    if (ids.code !== "ok") throw Error(ids.code);
    this.ids = ids.ids;
    this.idOffset = 0;
    this.idsDone = ids.done;
    this.account();
    return { kind: "progress" };
  }
  dispose() {
    metrics.visibilityBytes -= this.charge;
    this.charge = 0;
    this.page = empty();
    this.ids = new BigUint64Array();
    this.done = true;
    // The query pins retire with its frame/predecessor receipt. Candidate teardown
    // owns those releases; a successful done query already released its cursor.
  }
}
