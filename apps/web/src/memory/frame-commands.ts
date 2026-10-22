import { FrameWake } from "./frame-wake.ts";
import { admitFrame } from "./frame-admission.ts";
import type { FillReason } from "./frame-admission.ts";
import { scene } from "./scene-bridge.ts";
import { ReadyPreparation } from "./ready-preparation.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedCache, PreparedPage } from "./prepared-cache.ts";
export type FrameCommand =
  | { kind: "group" }
  | { kind: "composite" }
  | { kind: "page"; stroke: bigint; color: readonly number[]; page: PreparedPage };
export type FillBudget = { deadline: number; remaining: number };
export const commandTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export class FrameCommands {
  private queue: FrameCommand[] = [];
  private bytes = 0;
  private stopped = false;
  private done = false;
  private ids: bigint[] = [];
  private idsDone = false;
  private after = 0n;
  private stroke: { id: bigint; color: readonly number[] } | undefined;
  private pages: ReadyPreparation | undefined;
  private pending: Promise<void> | undefined;
  private error: unknown;
  private wake = new FrameWake();
  private oldest = 0;
  private reason: FillReason = "ready";
  private completion: Promise<void>;
  private state: () => ReplyValue;
  private prepared: PreparedCache;
  private through: bigint;
  private detail: number;
  private frame: bigint;
  constructor(
    state: () => ReplyValue,
    prepared: PreparedCache,
    through: bigint,
    detail: number,
    frame: bigint,
  ) {
    this.state = state;
    this.prepared = prepared;
    this.through = through;
    this.detail = detail;
    this.frame = frame;
    this.completion = this.produce()
      .catch((error: unknown) => {
        this.error = error;
        this.done = true;
      })
      .finally(() => this.wake.signal());
  }
  private push(command: FrameCommand) {
    if (!this.queue.length) this.oldest = performance.now();
    this.queue.push(command);
  }
  snapshot() {
    return {
      queued: this.queue.length,
      bytes: this.bytes,
      oldest: this.oldest,
      useful: this.queue.some((command) => command.kind !== "group"),
      done: this.done,
      stopped: this.stopped,
      reason: this.reason,
    };
  }
  fill(budget: FillBudget, limit = 32): FillReason {
    this.pending = undefined;
    while (
      !this.stopped &&
      !this.done &&
      this.queue.length < limit &&
      this.bytes <= 1024 ** 2 - 24576
    ) {
      if (budget.remaining-- <= 0 || performance.now() >= budget.deadline)
        return (this.reason = "budget");
      if (this.pages && this.stroke) {
        const next = this.pages.poll();
        if (next.kind === "pending") {
          this.pending = next.wait;
          return (this.reason = "pending");
        }
        if (next.kind === "progress") continue;
        if (next.kind === "page") {
          const page = this.prepared.borrow(next.page);
          if (page.data.byteLength > 24576) {
            page.release?.();
            throw Error("geometry-page-size");
          }
          this.push({ kind: "page", page, stroke: this.stroke.id, color: this.stroke.color });
          this.bytes += page.data.byteLength;
          continue;
        }
        this.pages = undefined;
        this.stroke = undefined;
        this.push({ kind: "composite" });
        continue;
      }
      if (!this.ids.length) {
        if (this.idsDone || this.after >= this.through) {
          this.done = true;
          break;
        }
        const ids = scene.ids(this.state(), this.after);
        if (ids.code !== "ok") throw Error(ids.code);
        this.ids = [...ids.ids];
        this.idsDone = ids.done;
        continue;
      }
      const id = this.ids.shift();
      if (id === undefined || id > this.through) {
        this.done = true;
        break;
      }
      const stroke = scene.stroke(this.state(), id);
      if (stroke.code !== "ok") throw Error(stroke.code);
      this.after = id;
      this.stroke = { id, color: stroke.color };
      const { prepared, detail, frame } = this;
      this.pages = new ReadyPreparation(
        (function* () {
          for (let chunk = 0n; chunk < (stroke.count + 127n) / 128n; chunk++)
            yield prepared.reader(id, stroke.count, detail, frame, chunk);
        })(),
      );
      this.push({ kind: "group" });
    }
    return (this.reason = this.queue.length ? "ready" : "done");
  }
  private async produce() {
    let budget = { deadline: performance.now() + 2, remaining: 1024 };
    while (!this.done && !this.stopped) {
      const reason = this.fill(budget);
      this.wake.signal();
      if (reason === "pending") await this.pending;
      else if (reason === "budget") {
        await commandTurn();
        budget = { deadline: performance.now() + 2, remaining: 1024 };
      } else if (!this.done) await this.wake.wait();
    }
  }
  ready() {
    return admitFrame(
      () => {
        if (this.error) throw this.error;
        return this.snapshot();
      },
      this.wake,
      this.state(),
      this.frame,
    );
  }
  take() {
    const command = this.queue.shift();
    if (command?.kind === "page") this.bytes -= command.page.data.byteLength;
    if (!this.queue.length) this.oldest = 0;
    this.wake.signal();
    return command;
  }
  stop() {
    this.stopped = true;
    this.wake.signal();
  }
  async dispose() {
    this.stop();
    for (const command of this.queue) if (command.kind === "page") command.page.release?.();
    this.queue = [];
    this.bytes = 0;
    this.wake.signal();
    await this.completion;
    await this.pages?.dispose();
    this.pages = undefined;
  }
}
