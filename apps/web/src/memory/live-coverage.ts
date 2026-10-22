import type { prepareBegin } from "#preparation-bindings";
import { live } from "./live-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { LiveGpu } from "./live-gpu.ts";
import { liveOwnerObservation } from "./performance-observation.ts";
import { LiveJob } from "./live-job.ts";
import { LiveTail } from "./live-tail.ts";
import { tailObservation } from "./tail-observation.ts";
export class LiveCoverage {
  readonly stroke: bigint;
  readonly frame: bigint;
  readonly gpu: LiveGpu;
  through = 0n;
  private stable: LiveJob | undefined;
  private tail: LiveTail;
  private tailFirst = false;
  private state: () => ReplyValue;
  private prepare: typeof prepareBegin;
  private detail: number;
  constructor(
    stroke: bigint,
    frame: bigint,
    detail: number,
    gpu: LiveGpu,
    state: () => ReplyValue,
    prepare: typeof prepareBegin,
  ) {
    this.stroke = stroke;
    this.frame = frame;
    this.detail = detail;
    this.gpu = gpu;
    this.state = state;
    this.prepare = prepare;
    this.tail = new LiveTail(state, gpu, prepare, frame, stroke, detail);
    if (import.meta.env.MODE === "performance-e2e") liveOwnerObservation(state(), stroke);
  }
  private advanceStable(color: readonly number[], deadline: number) {
    while (performance.now() < deadline) {
      if (!this.stable) {
        const input = live.stable(this.state(), this.stroke, this.through, this.detail, this.frame);
        if (input.code !== "ok") throw Error(input.code);
        if (!input.token) {
          const previous = this.through;
          this.through = input.through;
          if (previous === this.through) break;
          continue;
        }
        this.stable = new LiveJob(input, this.prepare, this.state, this.frame, this.stroke);
      }
      if (!this.stable.step(this.gpu.stable, color)) continue;
      this.through = this.stable.through;
      this.stable.dispose();
      this.stable = undefined;
    }
  }
  advance(count: bigint, color: readonly number[], active: boolean) {
    const start = performance.now();
    const before = this.through;
    this.tailFirst = !this.tailFirst;
    if (!active) {
      this.tail.stopBack();
      this.advanceStable(color, start + 2);
    } else if (this.tailFirst) {
      this.tail.advance(count, this.through, color, start + 0.5);
      this.advanceStable(color, start + 2);
    } else {
      this.advanceStable(color, start + 1.5);
      this.tail.advance(count, this.through, color, start + 2);
    }
    this.tail.retire(this.through);
    if (import.meta.env.MODE === "performance-e2e" && !active)
      tailObservation(
        this.state(),
        "ended",
        this.stroke,
        count,
        this.through,
        this.through === count,
      );
    if (import.meta.env.MODE === "performance-e2e" && before !== this.through)
      tailObservation(
        this.state(),
        "stable",
        this.stroke,
        count,
        this.through,
        this.through === count,
      );
    return this.through === count && !this.stable;
  }
  covers(count: bigint) {
    return this.through === count || this.tail.covers(count);
  }
  dispose() {
    this.stable?.dispose();
    this.stable = undefined;
    this.tail.dispose();
  }
}
