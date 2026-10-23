import { orderedPreparation } from "./ordered-preparation.ts";
import { frames } from "./frame-bridge.ts";
import { PreparationExecutor } from "./preparation-executor.ts";
import { preparation } from "./preparation-bridge.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { PreparedStore } from "./prepared-store.ts";
import type { PreparedPage } from "./prepared-store.ts";
import { preparationTicket } from "../developer-diagnostics/preparation-ticket.ts";
export type { PreparedPage } from "./prepared-store.ts";
export class PreparedCache extends PreparedStore {
  private executor: PreparationExecutor | undefined;
  private generation = 0;
  private pendingPages = 0;
  private pendingBytes = 0;
  private stopped = false;
  reader(stroke: bigint, count: bigint, detail: number, frame: bigint, chunk: bigint) {
    const revision = count < (chunk + 1n) * 128n + 1n ? count : (chunk + 1n) * 128n + 1n;
    const hit = this.retained(stroke, revision, detail, frame, chunk);
    return hit ? this.retainedPages(hit) : this.chunk(stroke, count, detail, false, frame, chunk);
  }
  async *read(
    stroke: bigint,
    count: bigint,
    detail: number,
    urgent = false,
    frame = 0n,
  ): AsyncGenerator<PreparedPage> {
    const prepare = (chunk: bigint) => this.chunk(stroke, count, detail, urgent, frame, chunk);
    function* chunks() {
      for (let chunk = 0n; chunk < (count + 127n) / 128n; chunk++) yield prepare(chunk);
    }
    for await (const page of orderedPreparation(chunks())) yield this.borrows.borrow(page);
  }
  private async *chunk(
    stroke: bigint,
    count: bigint,
    detail: number,
    urgent: boolean,
    frame: bigint,
    chunk: bigint,
  ): AsyncGenerator<PreparedPage> {
    if (this.stopped) return;
    const generation = this.generation;
    const current = () => !this.stopped && generation === this.generation;
    const revision = count < (chunk + 1n) * 128n + 1n ? count : (chunk + 1n) * 128n + 1n;
    const key = `${stroke}:${chunk}`,
      entries = this.entries.get(key) ?? [];
    const hit = this.retained(stroke, revision, detail, frame, chunk);
    if (hit) {
      yield* this.retainedPages(hit);
      return;
    }
    let attempt = 0;
    const executor = (this.executor ??= new PreparationExecutor());
    const observerId = executor.diagnosticGeneration;
    for (;;) {
      if (!current()) throw Error("disposed");
      this.trim(0, 0, true);
      const input = frame
        ? frames.preparation(this.state(), stroke, chunk, revision, detail, frame)
        : preparation.begin(this.state(), stroke, chunk, revision, detail);
      if (input.code !== "ok") throw Error(input.code);
      if (!input.token) break;
      const trace = preparationTicket(this.state(), input.token, stroke, observerId, frame);
      const pages: PreparedPage[] = [];
      let ordinal = 0n,
        bytes = 0,
        complete = false,
        stored = false,
        streaming = false;
      const clipped = input.parameters[3] === 1;
      try {
        for await (const result of executor.pages(input, urgent || attempt > 0, trace)) {
          if (!current() || preparation.current(this.state(), input.token) !== "ok") {
            trace?.cause(!current() ? "disposed" : "stale");
            throw Error("stale-scene");
          }
          if (result.data.length) {
            this.trim(bytes + result.data.byteLength, pages.length + 1);
            const start = performance.now(),
              adopted = preparation.adopt(
                this.state(),
                input.token,
                ordinal++,
                result.data,
                result.origin,
              );
            metrics.adoptionMilliseconds += performance.now() - start;
            if (adopted.code !== "ok") throw Error(adopted.code);
            const page = { page: adopted.page, data: result.data };
            pages.push(page);
            this.pendingPages++;
            this.pendingBytes += page.data.byteLength;
            bytes += page.data.byteLength;
            yield page;
            // If retained working capacity is unavailable, streaming releases consumed leases.
            if (
              bytes > 8 * 1024 ** 2 ||
              this.bytes + this.pendingBytes > 8 * 1024 ** 2 ||
              this.pages + this.pendingPages > 3072 ||
              this.pendingPages > 128
            ) {
              for (const prior of pages) this.borrows.retire(prior);
              this.pendingPages -= pages.length;
              this.pendingBytes -= bytes;
              pages.length = 0;
              bytes = 0;
              streaming = true;
            }
          }
          if (result.done) {
            if (preparation.complete(this.state(), input.token, ordinal) !== "ok") {
              trace?.cause("stale");
              throw Error("stale-scene");
            }
            if (frame && !frames.coverage(this.state(), input.token, frame)) {
              trace?.cause("stale");
              throw Error("stale-mapping");
            }
            complete = true;
          }
        }
        if (!current()) throw Error("disposed");
        if (
          complete &&
          !streaming &&
          (!clipped || this.tickets < 192) &&
          this.bytes + bytes <= 8 * 1024 ** 2 &&
          this.pages + pages.length <= 3072
        ) {
          entries.push({
            stroke,
            revision,
            detail,
            token: clipped ? input.token : 0n,
            pages,
            bytes,
            used: this.frame,
            pins: 0,
          });
          this.entries.set(key, entries);
          this.bytes += bytes;
          this.pages += pages.length;
          if (clipped) this.tickets++;
          this.pendingPages -= pages.length;
          this.pendingBytes -= bytes;
          stored = true;
          if (!clipped) preparation.release(this.state(), input.token);
        } else preparation.release(this.state(), input.token);
        trace?.outcome("completed", Number(ordinal));
        break;
      } catch (error) {
        trace?.outcome(!current() ? "stale" : "rejected", Number(ordinal));
        if (!current()) throw Error("disposed", { cause: error });
        if (attempt++ === 0 && error instanceof Error && error.message === "worker-unavailable")
          continue;
        throw error;
      } finally {
        trace?.abandoned(Number(ordinal));
        if (!stored) {
          this.pendingPages -= pages.length;
          this.pendingBytes -= bytes;
          for (const page of pages) this.borrows.retire(page);
          preparation.release(this.state(), input.token);
        }
      }
    }
  }
  override resources() {
    const value = super.resources();
    return {
      ...value,
      bytes: value.bytes + this.pendingBytes,
      pages: value.pages + this.pendingPages,
    };
  }
  dispose() {
    this.stopped = true;
    this.cancel();
    this.clearStore();
  }
  cancel() {
    this.generation++;
    this.executor?.dispose();
    this.executor = undefined;
  }
}
