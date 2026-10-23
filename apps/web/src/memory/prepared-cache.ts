import { PendingPreparation } from "./pending-preparation.ts";
import { CleanupFailure } from "./cleanup-failure.ts";
import { PreparationTicket } from "./preparation-ticket.ts";
import { orderedPreparation } from "./ordered-preparation.ts";
import { frames } from "./frame-bridge.ts";
import { PreparationExecutor } from "./preparation-executor.ts";
import { preparation } from "./preparation-bridge.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { PreparedStore } from "./prepared-store.ts";
import type { PreparedPage } from "./prepared-store.ts";
export type { PreparedPage } from "./prepared-store.ts";
export class PreparedCache extends PreparedStore {
  private executor: PreparationExecutor | undefined;
  private generation = 0;
  private pending = { pages: 0, bytes: 0, tickets: 0 };
  private stopped = false;
  reader(stroke: bigint, count: bigint, detail: number, frame: bigint, chunk: bigint) {
    const revision = count < (chunk + 1n) * 128n + 1n ? count : (chunk + 1n) * 128n + 1n;
    const hit = this.retained(stroke, revision, detail, frame, chunk);
    return hit
      ? this.retainedPages(hit, detail)
      : this.chunk(stroke, count, detail, false, frame, chunk);
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
    const key = `${stroke}:${chunk}`;
    const hit = this.retained(stroke, revision, detail, frame, chunk);
    if (hit) {
      yield* this.retainedPages(hit, detail);
      return;
    }
    metrics.preparedRequests++;
    metrics.preparedMisses++;
    let attempt = 0;
    const executor = (this.executor ??= new PreparationExecutor());
    for (;;) {
      if (!current()) throw Error("disposed");
      const input = frame
        ? frames.preparation(this.state(), stroke, chunk, revision, detail, frame)
        : preparation.begin(this.state(), stroke, chunk, revision, detail);
      if (input.code !== "ok") throw Error(input.code);
      if (!input.token) break;
      const pending = new PendingPreparation(this.pending, this.borrows);
      let ordinal = 0n,
        complete = false,
        stored = false;
      const clipped = input.parameters[3] === 1;
      const ticket = new PreparationTicket(
        input.token,
        clipped,
        this.pending,
        this.uncertainty,
        this.state,
      );
      try {
        for await (const result of executor.pages(input, urgent || attempt > 0)) {
          if (!current() || preparation.current(this.state(), input.token) !== "ok")
            throw Error("stale-scene");
          if (result.data.length) {
            if (!this.room(result.data.byteLength, 1) || this.pending.pages >= 128) {
              pending.streaming = true;
              pending.release();
            }
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
            pending.add(page);
            yield page;
            if (pending.streaming) pending.release();
          }
          if (result.done) {
            if (preparation.complete(this.state(), input.token, ordinal) !== "ok")
              throw Error("stale-scene");
            if (frame && !frames.coverage(this.state(), input.token, frame))
              throw Error("stale-mapping");
            complete = true;
          }
        }
        if (!current()) throw Error("disposed");
        if (
          complete &&
          !pending.streaming &&
          this.room(0, 0) &&
          (clipped || pending.pages.length > 0)
        ) {
          const bytes = pending.bytes;
          this.retain({
            key,
            stroke,
            revision,
            detail,
            token: clipped ? input.token : 0n,
            pages: pending.take(),
            bytes,
            used: this.residency.active?.sequence ?? 0,
            admitted: this.residency.admit(),
            pins: 0,
            borrowers: 0,
            stale: false,
          });
          stored = true;
          if (clipped) ticket.transfer();
        } else if (
          complete &&
          pending.totalPages <= 128 &&
          pending.totalBytes <= 3145728 &&
          (pending.totalPages > 0 || clipped)
        ) {
          metrics.preparedCapacityRefusals++;
          this.residency.refuse(pending.totalBytes, pending.totalPages, clipped ? 1 : 0, 3145728);
        }
        if (!stored || !clipped) ticket.release();
        break;
      } catch (error) {
        if (!current() && !(error instanceof CleanupFailure))
          throw Error("disposed", { cause: error });
        if (attempt++ === 0 && error instanceof Error && error.message === "worker-unavailable")
          continue;
        throw error;
      } finally {
        try {
          pending.release();
        } finally {
          ticket.release();
        }
      }
    }
  }
  override resources() {
    const value = super.resources();
    return {
      ...value,
      tickets: value.tickets + this.pending.tickets,
      metadataEstimate: value.metadataEstimate + this.pending.pages * 96,
      bytes: value.bytes + this.pending.bytes,
      pages: value.pages + this.pending.pages,
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
