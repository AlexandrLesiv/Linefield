import { frames } from "./frame-bridge.ts";
import { published } from "../developer-diagnostics/publication-observation.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { ReplyValue } from "./bridge.ts";
import type { Receipt } from "./frame-receipt.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import { ReceiptLeases } from "./receipt-lease.ts";
import type { ReceiptLease } from "./receipt-lease.ts";
export class DisplayBase {
  private lease: ReceiptLease | undefined;
  private release: (() => void) | undefined;
  private texture: WebGLTexture | undefined;
  private epoch = 0;
  private leases: ReceiptLeases;
  get receipt() {
    return this.lease?.receipt;
  }
  prefix = false;
  historical = false;
  private state: () => ReplyValue;
  private releaseState: ReplyValue;
  constructor(state: () => ReplyValue, leases = new ReceiptLeases()) {
    this.state = state;
    this.releaseState = state();
    this.leases = leases;
  }
  seedSource(renderer: GpuRenderer) {
    return this.prefix &&
      !this.historical &&
      this.epoch === renderer.epoch &&
      this.texture === renderer.resources.base.texture
      ? this.lease
      : undefined;
  }
  get installed() {
    return this.prefix ? (this.receipt?.id ?? 0n) : 0n;
  }
  transform() {
    if (!this.receipt) return undefined;
    if (this.prefix && frames.transform(this.state(), this.receipt.id).code !== "ok")
      this.historical = true;
    const transform = frames.displayTransform(this.state(), this.receipt.id);
    if (transform.code !== "ok") {
      this.dispose();
      return undefined;
    }
    return transform.matrix;
  }
  publish(next: Receipt, renderer: GpuRenderer, prefix: boolean) {
    this.prefix = false;
    this.historical = true;
    // Incoming ownership is registered before the old release can poison the engine.
    const incoming = this.leases.adopt(next, this.releaseState);
    this.dispose();
    this.lease = incoming;
    this.release = this.lease.reference();
    this.texture = renderer.resources.base.texture;
    this.epoch = renderer.epoch;
    this.prefix = prefix;
    this.historical = !prefix;
    if (prefix) {
      metrics.completeFrames++;
      published(this.state(), renderer, next);
    }
  }
  get acknowledgement() {
    const s = this.state();
    return this.prefix &&
      !this.historical &&
      !s.interaction &&
      this.receipt?.key === `${s.content}:${s.mapping}`
      ? this.receipt.id
      : undefined;
  }
  dispose() {
    this.prefix = false;
    this.historical = true;
    this.release?.();
    this.release = undefined;
    this.lease = undefined;
    this.texture = undefined;
    this.prefix = false;
    this.historical = false;
  }
}
