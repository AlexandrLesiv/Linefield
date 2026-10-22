import { frames } from "./frame-bridge.ts";
import { live } from "./live-bridge.ts";
import { buildFrame } from "./frame-builder.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { retirementObservation } from "./performance-observation.ts";
import { coverageObservation } from "./coverage-observation.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedCache } from "./prepared-cache.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { Receipt } from "./frame-receipt.ts";
export class CompletedCandidate {
  receipt: Receipt | undefined;
  ready = false;
  busy = false;
  sealed = false;
  private abort = new AbortController();
  private stopped = false;
  private pending: Receipt | undefined;
  private discard = false;
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
  private launch(next: Receipt, detail: number, predecessor?: Receipt) {
    this.pending = next;
    this.discard = false;
    this.ready = false;
    this.busy = true;
    metrics.pendingFrames = 1;
    void this.run(next, detail, predecessor).catch((error) => {
      if (!this.stopped) this.failed(error);
    });
  }
  private async run(next: Receipt, detail: number, predecessor?: Receipt) {
    let accepted = false;
    let issued = false;
    const alive = () =>
      !this.stopped &&
      !this.abort.signal.aborted &&
      frames.transform(this.state(), next.id).code === "ok";
    try {
      accepted = await buildFrame(
        this.state,
        this.prepared,
        this.renderer,
        next,
        detail,
        alive,
        this.abort.signal,
        predecessor ? { after: predecessor.through, issuing: () => (issued = true) } : undefined,
      );
      accepted = accepted && alive();
      if (accepted) {
        if (predecessor) frames.release(this.state(), predecessor.id);
        this.receipt = next;
        this.ready = true;
      }
    } catch (error) {
      if (
        !(
          error instanceof Error &&
          ["stale-scene", "stale-mapping", "disposed"].includes(error.message)
        )
      )
        throw error;
      metrics.stale++;
    } finally {
      if (!accepted) {
        frames.release(this.state(), next.id);
        const retain =
          predecessor &&
          !issued &&
          !this.discard &&
          !this.stopped &&
          frames.transform(this.state(), predecessor.id).code === "ok";
        if (predecessor && !retain) frames.release(this.state(), predecessor.id);
        this.receipt = retain ? predecessor : undefined;
        this.ready = !!retain;
        this.sealed = false;
        if (predecessor)
          coverageObservation(
            this.state(),
            retain ? "extension-retain" : "extension-discard",
            next.id,
          );
      }
      this.pending = undefined;
      this.busy = false;
      metrics.pendingFrames = 0;
      retirementObservation(this.state(), next.id, this.abort.signal.aborted);
      if (!this.stopped) {
        this.abort = new AbortController();
        this.changed();
      }
    }
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
    frames.release(this.state(), this.receipt.id);
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
      if (this.receipt) frames.release(this.state(), this.receipt.id);
      this.receipt = undefined;
      if (!this.stopped) this.abort = new AbortController();
    }
  }
  dispose() {
    this.stopped = true;
    this.cancel();
  }
}
