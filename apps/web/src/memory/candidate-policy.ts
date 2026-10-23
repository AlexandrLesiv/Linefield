import { frames } from "./frame-bridge.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
const key = (s: ReplyValue) => `${s.owner}:${s.session}:${s.content}:${s.mapping}`;
/** One optional-route retry per current target, retained across candidate cleanup. */
export class CandidatePolicy {
  private target = "";
  private canonical = false;
  exact = false;
  private update(state: ReplyValue) {
    const next = key(state);
    if (next === this.target) return;
    this.target = next;
    this.canonical = false;
    this.exact = false;
  }
  capture(state: ReplyValue, renderer: GpuRenderer) {
    this.update(state);
    return this.canonical || !renderer.resources.integerQuad
      ? frames.canonical(state)
      : frames.capture(state);
  }
  canSeed(state: ReplyValue) {
    this.update(state);
    return !this.canonical;
  }
  preferExact(state: ReplyValue) {
    this.update(state);
    this.exact = true;
  }
  retry(started: ReplyValue, current: ReplyValue) {
    if (key(started) !== key(current)) return true; // Obsolete targets are discarded, never retried.
    this.update(current);
    if (this.canonical) return false;
    this.canonical = true;
    metrics.panFallbacks++;
    return true;
  }
}
