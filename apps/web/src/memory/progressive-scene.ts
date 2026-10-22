import { sumGeometry } from "./resource-monitor.ts";
import { pendingCoverage } from "./pending-coverage.ts";
import { publicationObservation } from "./performance-observation.ts";
import { buildFrame } from "./frame-builder.ts";
import { LiveCoverage } from "./live-coverage.ts";
import { live } from "./live-bridge.ts";
import type { prepareBegin } from "#preparation-bindings";
import { frames } from "./frame-bridge.ts";
import { scene } from "./scene-bridge.ts";
import { PreparedCache } from "./prepared-cache.ts";
import { ActivePages } from "./active-pages.ts";
import { loadPreparation } from "./preparation-loader.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import { FramePromotion } from "./frame-promotion.ts";
import type { Receipt } from "./frame-promotion.ts";
export class ProgressiveScene {
  inputComplete = false;
  private prepared: PreparedCache;
  private immediate: ActivePages | undefined;
  private prepare: typeof prepareBegin | undefined;
  private live: LiveCoverage | undefined;
  private promotion: FramePromotion;
  private base: Receipt | undefined;
  private candidate: Receipt | undefined;
  private stopped = false;
  private state: () => ReplyValue;
  private renderer: GpuRenderer;
  private changed: () => void;
  private failed: (error: unknown) => void;
  constructor(
    state: () => ReplyValue,
    renderer: GpuRenderer,
    changed: () => void,
    failed: (error: unknown) => void,
  ) {
    this.state = state;
    this.renderer = renderer;
    this.changed = changed;
    this.failed = failed;
    this.prepared = new PreparedCache(state);
    this.promotion = new FramePromotion(
      state,
      renderer,
      (next) => {
        this.publish(next);
        this.live?.dispose();
        this.live = undefined;
        this.changed();
      },
      (error) => {
        if (!this.stopped) this.failed(error);
      },
    );
  }
  get ready() {
    return !!this.base;
  }
  render(detail: number) {
    this.inputComplete = false;
    const s = this.state(),
      key = `${s.content}:${s.mapping}`;
    let transform = this.base ? frames.transform(s, this.base.id) : undefined;
    if (transform && transform.code !== "ok") {
      if (this.base) frames.release(s, this.base.id);
      this.base = undefined;
      transform = undefined;
    }
    if (!this.base && this.live) {
      this.promotion.cancel();
      this.live.dispose();
      this.live = undefined;
    }
    const first = this.base ? scene.ids(s, this.base.through).ids[0] : undefined;
    if (this.live && first !== this.live.stroke) {
      this.promotion.cancel();
      this.live.dispose();
      this.live = undefined;
    }
    if (
      !this.candidate &&
      !this.live &&
      first !== undefined &&
      scene.stroke(s, first).active &&
      this.base?.key.split(":")[1] === `${s.mapping}` &&
      this.prepare
    ) {
      this.live = new LiveCoverage(
        first,
        this.base.id,
        detail,
        this.renderer.live(),
        this.state,
        this.prepare,
      );
    }
    if (!this.candidate && !this.live && this.base?.key !== key) {
      const captured = frames.capture(s);
      if (captured.code !== "ok") throw Error(captured.code);
      const receipt = { id: captured.id, through: captured.through, key: captured.key };
      this.candidate = receipt;
      metrics.pendingFrames = 1;
      void this.build(receipt, detail).catch((error) => {
        if (!this.stopped) this.failed(error);
      });
    }
    const pass = this.renderer.overlay(transform?.matrix, !!this.base, !this.live);
    if (!this.base || !this.immediate) return;
    this.immediate.begin();
    let after = this.base.through,
      covered = true;
    if (this.live) {
      const stroke = scene.stroke(this.state(), this.live.stroke);
      if (stroke.code !== "ok") throw Error(stroke.code);
      const complete = this.promotion.busy || this.live.advance(stroke.count, stroke.color);
      covered = this.promotion.busy || this.live.covers(stroke.count);
      this.live.gpu.display(stroke.color, transform?.matrix, !this.promotion.busy);
      after = this.live.stroke;
      if (complete && !this.promotion.busy) {
        const next = live.append(this.state(), this.base.id, this.live.stroke);
        if (next.code === "ok") {
          const gpu = this.live.gpu;
          this.promotion.stage(next, () => gpu.stage(stroke.color));
        } else if (next.code !== "stale-scene") throw Error(next.code);
      }
      this.changed();
    }
    const pendingComplete = pendingCoverage(
      this.state,
      this.immediate,
      pass,
      after,
      detail,
      this.live,
    );
    this.inputComplete =
      covered && pendingComplete && this.base.key.split(":")[1] === `${s.mapping}`;
    if (this.immediate.pending) this.changed();
  }
  private async build(receipt: Receipt, detail: number) {
    let published = false;
    try {
      this.prepare ??= await loadPreparation();
      this.immediate ??= new ActivePages(this.state, this.prepare);
      if (this.stopped) return;
      if (
        !(await buildFrame(
          this.state,
          this.prepared,
          this.renderer,
          receipt,
          detail,
          () => !this.stopped && !this.live,
        ))
      )
        return;
      this.renderer.promote();
      this.publish(receipt);
      published = true;
    } catch (error) {
      if (
        error instanceof Error &&
        ["stale-scene", "stale-mapping", "disposed"].includes(error.message)
      )
        metrics.stale++;
      else throw error;
    } finally {
      if (!published) frames.release(this.state(), receipt.id);
      this.candidate = undefined;
      metrics.pendingFrames = 0;
      if (!this.stopped) this.changed();
    }
  }
  private publish(receipt: Receipt) {
    if (this.base) frames.release(this.state(), this.base.id);
    this.base = receipt;
    metrics.completeFrames++;
    publicationObservation(this.state(), this.renderer, receipt);
  }
  get acknowledgement() {
    const s = this.state();
    return !s.interaction && this.base?.key === `${s.content}:${s.mapping}`
      ? this.base.id
      : undefined;
  }
  submitted(serial: number) {
    this.promotion.submit(serial);
  }
  resources = () => sumGeometry(this.prepared.resources(), this.immediate?.resources());
  dispose() {
    this.stopped = true;
    this.promotion.cancel();
    this.prepared.dispose();
    this.immediate?.dispose();
    this.live?.dispose();
    if (this.base) frames.release(this.state(), this.base.id);
  }
}
