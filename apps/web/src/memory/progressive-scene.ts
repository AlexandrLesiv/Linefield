import type { prepareBegin } from "#preparation-bindings";
import { currentCoverage } from "./current-coverage.ts";
import { consumePrefix } from "./consume-prefix.ts";
import { ReceiptLeases } from "./receipt-lease.ts";
import { cleanupScene } from "./scene-cleanup.ts";
import type { Coverage } from "./current-coverage.ts";
import { CompletedCandidate } from "./completed-candidate.ts";
import { DisplayBase } from "./display-base.ts";
import { LiveOwner } from "./live-owner.ts";
import { displayGraph } from "./display-graph.ts";
import type { DisplayGraph } from "./display-graph.ts";
import { frames } from "./frame-bridge.ts";
import { coverageObservation } from "./coverage-observation.ts";
import { PreparedCache } from "./prepared-cache.ts";
import { loadPreparation } from "./preparation-loader.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
export class ProgressiveScene {
  inputComplete = false;
  private prepared: PreparedCache;
  private prepare: typeof prepareBegin | undefined;
  private live: LiveOwner;
  private base: DisplayBase;
  private leases = new ReceiptLeases();
  private candidate: CompletedCandidate;
  private cleanup: Promise<void> | undefined;
  private state: () => ReplyValue;
  private renderer: GpuRenderer;
  private changed: () => void;
  constructor(
    state: () => ReplyValue,
    renderer: GpuRenderer,
    changed: () => void,
    failed: (error: unknown) => void,
  ) {
    this.state = state;
    this.renderer = renderer;
    this.changed = changed;
    this.prepared = new PreparedCache(state, failed);
    this.base = new DisplayBase(state, this.leases);
    this.live = new LiveOwner(state);
    this.candidate = new CompletedCandidate(state, this.prepared, renderer, changed, failed);
    void loadPreparation()
      .then((prepare) => {
        if (!this.cleanup) {
          this.prepare = prepare;
          changed();
        }
      })
      .catch((error) => {
        if (!this.cleanup) failed(error);
      });
  }
  get ready() {
    return !!this.base.receipt;
  }
  private coverage() {
    const q = currentCoverage(
      this.state(),
      this.live.value?.frame,
      this.base.installed,
      this.candidate.receipt?.id,
    );
    if (q.code !== "ok") throw Error(q.code);
    return q;
  }
  private graph(q: Coverage): DisplayGraph {
    let candidate: Float32Array | undefined;
    if (this.candidate.sealed && this.candidate.receipt) {
      const transform = frames.displayTransform(this.state(), this.candidate.receipt.id);
      if (transform.code !== "ok") throw Error(transform.code);
      candidate = transform.matrix;
    }
    return {
      base: this.base.transform(),
      candidate,
      live: this.live.graph(q),
      candidateIncludesLive: q.candidateIncludesLive,
    };
  }
  private consume(q: Coverage, detail: number) {
    return consumePrefix(
      this.state,
      this.renderer,
      this.base,
      this.candidate,
      this.live,
      () => this.graph(q),
      q,
      detail,
    );
  }
  render(detail: number) {
    this.inputComplete = false;
    this.base.transform();
    this.candidate.validatePending();
    let q = this.coverage();
    this.live.observe(q);
    if (this.candidate.receipt && !q.candidateValid) this.candidate.cancel();
    if (q.liveState === "obsolete" || q.liveState === "included") this.live.dispose();
    q = this.coverage();
    const retainingEnded =
      q.liveState === "ended" &&
      !q.activeSource &&
      !q.candidateIncludesLive &&
      this.live.value?.through !== q.liveCount;
    if (this.candidate.sealed && q.canFold && !retainingEnded) {
      if (!this.consume(q, detail)) return this.present(q);
      q = this.coverage();
      if (!q.candidateViewCurrent) this.candidate.cancel();
    }
    q = this.coverage();
    if (
      this.candidate.ready &&
      q.candidateRecaptureSafe &&
      !q.candidateExactView &&
      !q.viewGestureActive
    ) {
      this.candidate.recapture();
      q = this.coverage();
    }
    if (this.candidate.ready && q.candidateExactView && !q.viewGestureActive) {
      const next = this.candidate.take();
      if (!next) throw Error("gpu-queue");
      this.renderer.promote();
      this.base.publish(next, this.renderer, true);
      q = this.coverage();
      if (q.liveState === "included") {
        this.live.dispose();
        q = this.coverage();
      }
    } else if (this.candidate.ready && q.candidateAtCutoff && !this.candidate.sealed) {
      this.candidate.sealed = true;
      coverageObservation(this.state(), "seal", this.candidate.receipt?.id ?? 0n);
    }
    if (
      this.live.value &&
      q.liveState === "ended" &&
      q.activeSource &&
      !this.candidate.sealed &&
      q.canFold
    ) {
      if (!this.consume(q, detail)) return this.present(q);
      q = this.coverage();
    }
    if (!this.live.value && q.activeSource && this.prepare) {
      this.live.start(q.activeSource, detail, this.renderer, this.prepare);
      q = this.coverage();
      this.live.observe(q);
    }
    this.live.advance(q);
    if (this.candidate.ready && !this.candidate.sealed && q.nextSource)
      this.candidate.extend(q.nextSource, detail);
    const s = this.state();
    if (
      this.prepare &&
      (!this.base.prefix ||
        this.base.historical ||
        this.base.receipt?.key !== `${s.content}:${s.mapping}`)
    ) {
      const source = !q.activeSource && this.base.seedSource(this.renderer);
      if (source) this.candidate.seed(detail, source);
      this.candidate.start(detail);
    }
    this.present(this.coverage());
  }
  private present(q: Coverage) {
    displayGraph(this.renderer, this.graph(q));
    const s = this.state();
    this.inputComplete =
      this.base.prefix &&
      !this.base.historical &&
      this.base.receipt?.key === `${s.content}:${s.mapping}` &&
      (!q.activeSource || (q.liveState === "active" && !!this.live.value?.covers(q.liveCount)));
    if (
      this.live.value ||
      this.candidate.busy ||
      this.candidate.sealed ||
      !this.inputComplete ||
      !this.base.receipt
    )
      this.changed();
  }
  get acknowledgement() {
    return this.base.acknowledgement;
  }
  resources = () => this.leases.combine(this.prepared.resources());
  dispose() {
    if (this.cleanup) return this.cleanup;
    this.cleanup = cleanupScene([
      () => this.candidate.dispose(),
      () => this.prepared.dispose(),
      () => this.live.dispose(),
      () => this.base.dispose(),
    ]).then(() => this.leases.drained());
    return this.cleanup;
  }
}
