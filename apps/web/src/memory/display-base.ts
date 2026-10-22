import { frames } from "./frame-bridge.ts";
import { publicationObservation } from "./performance-observation.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { ReplyValue } from "./bridge.ts";
import type { Receipt } from "./frame-receipt.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
export class DisplayBase {
  receipt: Receipt | undefined;
  prefix = false;
  historical = false;
  private state: () => ReplyValue;
  constructor(state: () => ReplyValue) {
    this.state = state;
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
    this.dispose();
    this.receipt = next;
    this.prefix = prefix;
    this.historical = !prefix;
    if (prefix) {
      metrics.completeFrames++;
      publicationObservation(this.state(), renderer, next);
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
    if (this.receipt) frames.release(this.state(), this.receipt.id);
    this.receipt = undefined;
    this.prefix = false;
    this.historical = false;
  }
}
