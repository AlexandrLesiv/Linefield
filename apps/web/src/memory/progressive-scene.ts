import { observeCoverage } from "../developer-diagnostics/source-observation.ts";
import type { prepareBegin } from "#preparation-bindings";
import { currentCoverage } from "./current-coverage.ts";
import { consumePrefix } from "./consume-prefix.ts";
import { inputCovered, retainingEnded } from "./scene-readiness.ts";
import { ReceiptLeases } from "./receipt-lease.ts";
import { cleanupScene } from "./scene-cleanup.ts";
import type { Coverage } from "./current-coverage.ts";
import { CompletedCandidate } from "./completed-candidate.ts";
import { promoteCandidate } from "./candidate-promotion.ts";
import { consumeViewCandidate } from "./view-candidate.ts";
import { DisplayBase } from "./display-base.ts";
import { LiveOwner } from "./live-owner.ts";
import { displayGraph, sceneGraph } from "./display-graph.ts";
import type { DisplayGraph } from "./display-graph.ts";
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
    return observeCoverage(this.state(), q);
  }
  private graph(q: Coverage): DisplayGraph {
    return sceneGraph(this.state(), this.base, this.candidate, this.live, q);
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
    let consumed = false;
    if (this.candidate.sealed && q.canFold && !retainingEnded(q, this.live)) {
      if (!this.consume(q, detail)) return this.present(q);
      consumed = true;
      q = this.coverage();
      if (!q.candidateViewCurrent) this.candidate.cancel();
    }
    q = this.coverage();
    if (this.candidate.ready && q.candidateRecaptureSafe && !q.candidateExactView) {
      this.candidate.recapture();
      q = this.coverage();
    }
    if (
      consumeViewCandidate(
        this.state(),
        this.renderer,
        this.base,
        this.candidate,
        this.live,
        () => this.graph(q),
        q,
      )
    )
      q = this.coverage();
    if (promoteCandidate(this.state(), this.candidate, this.base, this.renderer, q)) {
      q = this.coverage();
      if (q.liveState === "included") {
        this.live.dispose();
        q = this.coverage();
      }
    } else if (this.candidate.ready && q.candidateAtCutoff && !this.candidate.sealed) {
      this.candidate.sealed = true;
      coverageObservation(this.state(), "seal", this.candidate.receipt?.id ?? 0n);
      if (!consumed && q.canFold && !retainingEnded(q, this.live)) {
        if (!this.consume(q, detail)) return this.present(q);
        q = this.coverage();
        if (!q.candidateViewCurrent) this.candidate.cancel();
        q = this.coverage();
      }
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
    this.inputComplete = inputCovered(q, this.base, this.live, this.state());
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
