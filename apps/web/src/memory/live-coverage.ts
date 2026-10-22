import type { prepareBegin } from "#preparation-bindings";
import { live } from "./live-bridge.ts";
import { preparation } from "./preparation-bridge.ts";
import { scene } from "./scene-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { LiveGpu } from "./live-gpu.ts";
import type { GpuPass } from "./gpu-pass.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import { liveOwnerObservation } from "./performance-observation.ts";
type Job = {
  token: bigint;
  ordinal: bigint;
  through: bigint;
  source: ReturnType<typeof prepareBegin>;
};
export class LiveCoverage {
  readonly stroke: bigint;
  readonly frame: bigint;
  readonly gpu: LiveGpu;
  through = 0n;
  private stable: Job | undefined;
  private tail: Job | undefined;
  private tailKey = "";
  private tailThrough = 0n;
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
    if (import.meta.env.MODE === "performance-e2e") liveOwnerObservation(state(), stroke);
  }
  private release(job: Job | undefined) {
    if (!job) return;
    job.source.free();
    preparation.release(this.state(), job.token);
  }
  private issue(from: bigint, tail: boolean) {
    const input = (tail ? live.tail : live.stable)(
      this.state(),
      this.stroke,
      from,
      this.detail,
      this.frame,
    );
    if (input.code !== "ok") throw Error(input.code);
    if (!input.token) return { through: input.through, job: undefined };
    return {
      through: from,
      job: {
        token: input.token,
        ordinal: 0n,
        through: input.through,
        source: this.prepare(input.points, input.parameters),
      },
    };
  }
  private step(job: Job, pass: GpuPass, color: readonly number[]) {
    const start = performance.now(),
      result = job.source.nextPage();
    try {
      const data = result.data;
      if (data.length) {
        const adopted = preparation.adopt(
          this.state(),
          job.token,
          job.ordinal++,
          data,
          result.origin,
        );
        if (adopted.code !== "ok") throw Error(adopted.code);
        try {
          const p = live.placement(this.state(), this.frame, this.stroke, adopted.page);
          if (p.code !== "ok") throw Error(p.code);
          if (p.available) pass.draw(data, p.matrix, color);
        } finally {
          scene.release(this.state(), adopted.page);
        }
      }
      if (result.done) {
        const code = preparation.complete(this.state(), job.token, job.ordinal);
        if (code !== "ok") throw Error(code);
      }
      return result.done;
    } finally {
      result.free();
      metrics.frameMilliseconds += performance.now() - start;
      metrics.fallbackPages++;
    }
  }
  advance(count: bigint, color: readonly number[]) {
    const start = performance.now();
    while (performance.now() - start < 1.5) {
      if (!this.stable) {
        const next = this.issue(this.through, false);
        if (!next.job) {
          const previous = this.through;
          this.through = next.through;
          if (previous === this.through) break;
          continue;
        }
        this.stable = next.job;
      }
      if (!this.step(this.stable, this.gpu.stable, color)) continue;
      this.through = this.stable.through;
      this.release(this.stable);
      this.stable = undefined;
    }
    const key = `${count}:${this.through}`;
    if (key !== this.tailKey) {
      this.release(this.tail);
      this.tail = undefined;
      this.tailKey = key;
      this.tailThrough = this.through;
      this.gpu.resetTail();
    }
    while (this.tailThrough < count && performance.now() - start < 2) {
      if (!this.tail) {
        const next = this.issue(this.tailThrough, true);
        this.tailThrough = next.through;
        this.tail = next.job;
        if (!this.tail) continue;
      }
      if (!this.step(this.tail, this.gpu.tail, color)) continue;
      this.tailThrough = this.tail.through;
      this.release(this.tail);
      this.tail = undefined;
    }
    return this.through === count && !this.stable;
  }
  covers(count: bigint) {
    return this.through === count || this.tailThrough === count;
  }
  invalidateTail() {
    this.tailKey = "";
  }
  dispose() {
    this.release(this.stable);
    this.release(this.tail);
    this.stable = undefined;
    this.tail = undefined;
  }
}
