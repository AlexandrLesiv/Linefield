import type { prepareBegin } from "#preparation-bindings";
import { currentCoverage, captureDisplay } from "./current-coverage.ts";
import type { Coverage } from "./current-coverage.ts";
import { CompletedCandidate } from "./completed-candidate.ts";
import { DisplayBase } from "./display-base.ts";
import { LiveOwner } from "./live-owner.ts";
import { consumeGraph, displayGraph } from "./display-graph.ts";
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
  private candidate: CompletedCandidate;
  private stopped = false;
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
    this.prepared = new PreparedCache(state);
    this.base = new DisplayBase(state);
    this.live = new LiveOwner(state);
    this.candidate = new CompletedCandidate(state, this.prepared, renderer, changed, failed);
    void loadPreparation()
      .then((prepare) => {
        if (!this.stopped) {
          this.prepare = prepare;
          changed();
        }
      })
      .catch((error) => {
        if (!this.stopped) failed(error);
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
  private consume(q: Coverage) {
    if (!q.canFold) return false;
    if (q.liveState !== "active") this.live.value?.stopBack();
    const next = captureDisplay(this.state());
    if (next.code === "capacity") return false;
    if (next.code !== "ok") throw Error(next.code);
    let issued = false;
    try {
      consumeGraph(this.renderer, this.graph(q));
      issued = true;
      coverageObservation(this.state(), q.liveState === "active" ? "copyback" : "consume", next.id);
      this.base.publish(next, this.renderer, false);
      this.candidate.sealed = false;
      if (q.liveState !== "active") this.live.dispose();
      return true;
    } finally {
      if (!issued) frames.release(this.state(), next.id);
    }
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
      if (!this.consume(q)) return this.present(q);
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
      if (!this.consume(q)) return this.present(q);
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
    )
      this.candidate.start(detail);
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
  submitted(_serial: number) {
    /* Candidate submissions validate before ownership transfer. */
  }
  resources = () => this.prepared.resources();
  dispose() {
    this.stopped = true;
    this.candidate.dispose();
    this.prepared.dispose();
    this.live.dispose();
    this.base.dispose();
  }
}
