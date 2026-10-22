import type { prepareBegin } from "#preparation-bindings";
import { preparation } from "./preparation-bridge.ts";
import { scene } from "./scene-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedPage } from "./prepared-cache.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
type Entry = {
  revision: bigint;
  detail: number;
  token: bigint;
  pages: PreparedPage[];
  used: number;
  done: boolean;
  clipped: boolean;
  ordinal: bigint;
  job: ReturnType<typeof prepareBegin> | undefined;
};
export class ActivePages {
  private entries = new Map<string, Entry>();
  private state: () => ReplyValue;
  private prepare: typeof prepareBegin;
  private frame = 0;
  private spent = 0;
  private bytes = 0;
  private pages = 0;
  private tickets = 0;
  pending = false;
  constructor(state: () => ReplyValue, prepare: typeof prepareBegin) {
    this.state = state;
    this.prepare = prepare;
  }
  begin() {
    this.frame++;
    this.spent = 0;
    this.pending = false;
  }
  private drop(key: string, e: Entry) {
    for (const p of e.pages) {
      scene.release(this.state(), p.page);
      this.bytes -= p.data.byteLength;
      this.pages--;
    }
    e.job?.free();
    if (e.token) {
      preparation.release(this.state(), e.token);
      this.tickets--;
    }
    this.entries.delete(key);
  }
  private trim() {
    for (const [key, e] of this.entries) {
      if (
        this.bytes < 8 * 1024 ** 2 - 24576 &&
        this.pages < 768 &&
        this.entries.size < 768 &&
        this.tickets < 48
      )
        return;
      if (e.used !== this.frame || this.tickets >= 48) this.drop(key, e);
    }
  }
  *read(stroke: bigint, count: bigint, detail: number): Generator<PreparedPage> {
    for (let chunk = 0n; chunk < (count + 127n) / 128n; chunk++) {
      const key = `${stroke}:${chunk}`,
        revision = count < (chunk + 1n) * 128n + 1n ? count : (chunk + 1n) * 128n + 1n;
      let entry = this.entries.get(key);
      if (
        entry &&
        (entry.revision !== revision ||
          entry.detail < detail ||
          (entry.done && entry.token && !preparation.coverage(this.state(), entry.token)))
      ) {
        this.drop(key, entry);
        entry = undefined;
      }
      if (!entry) {
        if (this.spent >= 2) {
          this.pending = true;
          continue;
        }
        this.trim();
        if (
          this.bytes >= 8 * 1024 ** 2 - 24576 ||
          this.pages >= 768 ||
          this.entries.size >= 768 ||
          this.tickets >= 48
        ) {
          this.pending = true;
          return;
        }
        const started = performance.now();
        const input = preparation.begin(this.state(), stroke, chunk, revision, detail);
        if (input.code !== "ok") throw Error(input.code);
        if (!input.token) continue;
        entry = {
          revision,
          detail,
          token: input.token,
          pages: [],
          used: this.frame,
          done: false,
          clipped: input.parameters[3] === 1,
          ordinal: 0n,
          job: this.prepare(input.points, input.parameters),
        };
        this.entries.set(key, entry);
        this.tickets++;
        this.spent += performance.now() - started;
      }
      entry.used = this.frame;
      yield* entry.pages;
      while (
        entry.job &&
        this.spent < 2 &&
        this.bytes < 8 * 1024 ** 2 - 24576 &&
        this.pages < 768
      ) {
        const started = performance.now(),
          result = entry.job.nextPage();
        try {
          const data = result.data;
          metrics.fallbackPages++;
          this.spent += performance.now() - started;
          metrics.frameMilliseconds += performance.now() - started;
          if (data.length) {
            const adopted = preparation.adopt(
              this.state(),
              entry.token,
              entry.ordinal++,
              data,
              result.origin,
            );
            if (adopted.code !== "ok") throw Error(adopted.code);
            const page = { data, page: adopted.page };
            entry.pages.push(page);
            this.bytes += data.byteLength;
            this.pages++;
            yield page;
          }
          if (result.done) {
            const code = preparation.complete(this.state(), entry.token, entry.ordinal);
            if (code !== "ok") throw Error(code);
            entry.done = true;
            entry.job.free();
            entry.job = undefined;
            if (!entry.clipped) {
              preparation.release(this.state(), entry.token);
              entry.token = 0n;
              this.tickets--;
            }
          }
        } finally {
          result.free();
        }
      }
      if (entry.job) this.pending = true;
    }
  }
  finish() {
    this.trim();
  }
  resources() {
    return { bytes: this.bytes, pages: this.pages, streamOnly: false };
  }
  dispose() {
    for (const [key, e] of this.entries) this.drop(key, e);
  }
}
