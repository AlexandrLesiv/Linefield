import type { PreparedPage } from "./prepared-store.ts";
import { CleanupFailure } from "./cleanup-failure.ts";
type Reader = Generator<PreparedPage> | AsyncGenerator<PreparedPage>;
type Entry = {
  reader: Reader;
  result?: IteratorResult<PreparedPage> | undefined;
  pending?: Promise<void> | undefined;
  error?: unknown;
};
export type ReadyResult =
  | { kind: "page"; page: PreparedPage }
  | { kind: "progress" | "done" }
  | { kind: "pending"; wait: Promise<void> };
// A poll performs one bounded transition. Only explicitly resolved results are consumed;
// a pending painter-order head cannot be overtaken by later prefetched pages.
export class ReadyPreparation {
  private source: Iterator<Reader>;
  private queue: Entry[] = [];
  private ended = false;
  constructor(source: Iterable<Reader>) {
    this.source = source[Symbol.iterator]();
  }
  private advance(entry: Entry) {
    const result = entry.reader.next();
    if (result instanceof Promise) {
      entry.pending = result.then(
        (value) => {
          entry.result = value;
          entry.pending = undefined;
        },
        (error: unknown) => {
          entry.error = error;
          entry.pending = undefined;
        },
      );
    } else entry.result = result;
  }
  poll(): ReadyResult {
    if (!this.ended && this.queue.length < 8) {
      const next = this.source.next();
      if (next.done) this.ended = true;
      else {
        const entry: Entry = { reader: next.value };
        this.queue.push(entry);
        this.advance(entry);
      }
      return { kind: "progress" };
    }
    const head = this.queue[0];
    if (!head) return { kind: "done" };
    if (head.error) throw head.error;
    if (head.pending) return { kind: "pending", wait: head.pending };
    if (!head.result) {
      this.advance(head);
      return { kind: "progress" };
    }
    const result = head.result;
    head.result = undefined;
    if (result.done) {
      this.queue.shift();
      return { kind: "progress" };
    }
    return { kind: "page", page: result.value };
  }
  async dispose() {
    this.ended = true;
    const queue = this.queue;
    this.queue = [];
    let failure: unknown;
    try {
      this.source.return?.();
    } catch (error) {
      failure = error;
    }
    const settled = await Promise.allSettled(
      queue.map(async (entry) => {
        await entry.pending;
        let readerFailure = entry.error instanceof CleanupFailure ? entry.error : undefined;
        try {
          await entry.reader.return(undefined);
        } catch (error) {
          readerFailure ??= error instanceof CleanupFailure ? error : new CleanupFailure(error);
        }
        if (readerFailure) throw readerFailure;
      }),
    );
    for (const result of settled) if (result.status === "rejected") failure ??= result.reason;
    if (failure) throw failure;
  }
}
