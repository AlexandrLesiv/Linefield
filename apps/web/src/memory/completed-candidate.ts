import { frames } from "./frame-bridge.ts";
import { live } from "./live-bridge.ts";
import { buildCandidate } from "./candidate-build.ts";
import type { Seed } from "./candidate-build.ts";
import { frameReuse } from "./frame-reuse.ts";
import { copyPrefix } from "./gpu-seed.ts";
import type { ReceiptLease } from "./receipt-lease.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { retirementObservation } from "./performance-observation.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedCache } from "./prepared-cache.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { Receipt } from "./frame-receipt.ts";
import { CleanupFailure, cleanupRelease } from "./cleanup-failure.ts";
export class CompletedCandidate {
  receipt: Receipt | undefined;
  ready = false;
  busy = false;
  sealed = false;
  private abort = new AbortController();
  private stopped = false;
  private pending: Receipt | undefined;
  private discard = false;
  private completion: Promise<void> = Promise.resolve();
  private state: () => ReplyValue;
  private prepared: PreparedCache;
  private renderer: GpuRenderer;
  private changed: () => void;
  private failed: (error: unknown) => void;
  constructor(
    state: () => ReplyValue,
    prepared: PreparedCache,
    renderer: GpuRenderer,
    changed: () => void,
    failed: (error: unknown) => void,
  ) {
    this.state = state;
    this.prepared = prepared;
    this.renderer = renderer;
    this.changed = changed;
    this.failed = failed;
  }
  start(detail: number) {
    if (this.busy || this.receipt || this.stopped) return;
    const next = frames.capture(this.state());
    if (next.code === "capacity") return;
    if (next.code !== "ok") throw Error(next.code);
    this.receipt = next;
    this.launch(next, detail);
  }
  extend(source: bigint, detail: number) {
    if (!this.ready || this.busy || this.sealed || !this.receipt) return;
    const next = live.append(this.state(), this.receipt.id, source);
    if (next.code === "capacity") return;
    if (next.code !== "ok") throw Error(next.code);
    this.launch(next, detail, this.receipt);
  }
  seed(detail: number, source: ReceiptLease) {
    if (this.busy || this.receipt || this.stopped || this.sealed) return;
    metrics.prefixSeedAttempts++;
    const next = frames.capture(this.state());
    if (next.code === "capacity") {
      metrics.prefixSeedCapacityMisses++;
      return;
    }
    if (next.code !== "ok") throw Error(next.code);
    let transferred = false;
    try {
      const reuse = frameReuse(this.state(), source.receipt.id, next.id);
      if (reuse.code !== "ok") throw Error(reuse.code);
      if (!reuse.reusable) {
        if (reuse.missReason === "view") metrics.prefixSeedViewMisses++;
        else if (reuse.missReason === "same-prefix") metrics.prefixSeedSameMisses++;
        else metrics.prefixSeedCountMisses++;
        return;
      }
      const release = source.borrow();
      this.receipt = next;
      transferred = true;
      this.launch(next, detail, source.receipt, {
        release,
        copy: () => {
          copyPrefix(this.renderer);
          metrics.prefixSeedCopies++;
          metrics.prefixSeedPixels += this.renderer.width * this.renderer.height;
          metrics.prefixSeedSkippedSources += Number(reuse.sourceCount);
        },
      });
    } finally {
      if (!transferred) cleanupRelease(() => frames.release(this.state(), next.id));
    }
  }
  private launch(next: Receipt, detail: number, predecessor?: Receipt, seed?: Seed) {
    this.pending = next;
    this.discard = false;
    this.ready = false;
    this.busy = true;
    metrics.pendingFrames = 1;
    const signal = this.abort.signal;
    const operation = buildCandidate({
      owner: this,
      state: this.state,
      prepared: this.prepared,
      renderer: this.renderer,
      next,
      detail,
      signal,
      predecessor,
      seed,
      alive: () =>
        !this.stopped && !signal.aborted && frames.transform(this.state(), next.id).code === "ok",
      retain: () => !this.discard && !this.stopped,
      settled: () => {
        this.pending = undefined;
        this.busy = false;
        metrics.pendingFrames = 0;
        retirementObservation(this.state(), next.id, signal.aborted);
        if (!this.stopped) {
          this.abort = new AbortController();
          this.changed();
        }
      },
    });
    this.completion = operation.catch((error) => {
      if (error instanceof CleanupFailure) throw error;
    });
    void this.completion.catch(() => {});
    void operation.catch((error) => {
      if (!this.stopped) this.failed(error);
    });
  }
  validatePending() {
    if (
      this.pending &&
      !this.abort.signal.aborted &&
      frames.transform(this.state(), this.pending.id).code !== "ok"
    ) {
      this.abort.abort();
      this.prepared.cancel();
    }
  }
  recapture() {
    if (!this.ready || this.sealed || !this.receipt) return;
    const next = frames.capture(this.state());
    if (next.code === "capacity") return;
    if (next.code !== "ok") throw Error(next.code);
    const previous = this.receipt.id;
    cleanupRelease(() => frames.release(this.state(), previous));
    this.receipt = next;
  }
  take() {
    if (!this.ready || this.busy || this.sealed) throw Error("gpu-queue");
    const next = this.receipt;
    this.receipt = undefined;
    this.ready = false;
    return next;
  }
  cancel() {
    this.discard = true;
    this.abort.abort();
    this.prepared.cancel();
    this.ready = false;
    this.sealed = false;
    if (!this.busy) {
      const receipt = this.receipt;
      if (receipt) cleanupRelease(() => frames.release(this.state(), receipt.id));
      this.receipt = undefined;
      if (!this.stopped) this.abort = new AbortController();
    }
  }
  dispose() {
    this.stopped = true;
    this.cancel();
    return this.completion;
  }
}
