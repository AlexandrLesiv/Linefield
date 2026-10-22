import type { prepareBegin } from "#preparation-bindings";
import { captureLive } from "./current-coverage.ts";
import { frames } from "./frame-bridge.ts";
import { scene } from "./scene-bridge.ts";
import { LiveCoverage } from "./live-coverage.ts";
import { strokeCountObservation } from "./performance-observation.ts";
import type { ReplyValue } from "./bridge.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { Coverage } from "./current-coverage.ts";
import type { DisplayGraph } from "./display-graph.ts";
export class LiveOwner {
  value: LiveCoverage | undefined;
  private color: readonly number[] = [];
  private state: () => ReplyValue;
  constructor(state: () => ReplyValue) {
    this.state = state;
  }
  start(source: bigint, detail: number, renderer: GpuRenderer, prepare: typeof prepareBegin) {
    if (this.value || !source) return;
    const anchor = captureLive(this.state(), source);
    if (anchor.code === "capacity") return;
    if (anchor.code !== "ok") throw Error(anchor.code);
    try {
      const stroke = scene.stroke(this.state(), source);
      if (stroke.code !== "ok") throw Error(stroke.code);
      this.color = stroke.color;
      this.value = new LiveCoverage(
        source,
        anchor.id,
        detail,
        renderer.live(),
        this.state,
        prepare,
      );
    } catch (error) {
      frames.release(this.state(), anchor.id);
      throw error;
    }
  }
  advance(q: Coverage) {
    if (!this.value) return;
    const active = q.liveState === "active";
    this.value.advance(q.liveCount, this.color, active);
  }
  observe(q: Coverage) {
    if (this.value && ["active", "ended", "included"].includes(q.liveState))
      strokeCountObservation(this.state(), q.liveSource, q.liveCount, q.liveState === "active");
  }
  graph(q: Coverage): DisplayGraph["live"] {
    if (!this.value) return undefined;
    const transform = frames.displayTransform(this.state(), this.value.frame);
    if (transform.code !== "ok") throw Error(transform.code);
    return {
      gpu: this.value.gpu,
      color: this.color,
      matrix: transform.matrix,
      active: q.liveState === "active",
    };
  }
  dispose() {
    if (!this.value) return;
    this.value.dispose();
    frames.release(this.state(), this.value.frame);
    this.value = undefined;
    this.color = [];
  }
}
