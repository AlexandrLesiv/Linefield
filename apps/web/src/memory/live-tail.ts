import type { prepareBegin } from "#preparation-bindings";
import type { ReplyValue } from "./bridge.ts";
import type { LiveGpu } from "./live-gpu.ts";
import { tail } from "./tail-bridge.ts";
import { LiveJob } from "./live-job.ts";
import { tailObservation } from "./tail-observation.ts";
type Receipt = ReturnType<typeof tail.capture>;
export class LiveTail {
  private front: Receipt | undefined;
  private back: Receipt | undefined;
  private job: LiveJob | undefined;
  private state: () => ReplyValue;
  private gpu: LiveGpu;
  private prepare: typeof prepareBegin;
  private frame: bigint;
  private stroke: bigint;
  private detail: number;
  constructor(
    state: () => ReplyValue,
    gpu: LiveGpu,
    prepare: typeof prepareBegin,
    frame: bigint,
    stroke: bigint,
    detail: number,
  ) {
    this.state = state;
    this.gpu = gpu;
    this.prepare = prepare;
    this.frame = frame;
    this.stroke = stroke;
    this.detail = detail;
  }
  retire(through: bigint) {
    if (this.front && this.front.count <= through) {
      this.gpu.clearFront();
      tail.release(this.state(), this.front.id);
      this.front = undefined;
    }
    if (this.back && this.back.count <= through) {
      this.stopBack();
    }
  }
  stopBack() {
    this.job?.dispose();
    this.job = undefined;
    if (this.back) {
      if (import.meta.env.MODE === "performance-e2e")
        tailObservation(this.state(), "stop", this.stroke, this.back.count, this.back.from, false);
      tail.release(this.state(), this.back.id);
    }
    this.back = undefined;
  }
  advance(count: bigint, through: bigint, color: readonly number[], deadline: number) {
    this.retire(through);
    if (!this.back && count > through && this.front?.count !== count) {
      const next = tail.capture(this.state(), this.stroke, this.frame, through, this.detail);
      if (next.code !== "ok" || next.anchor !== this.frame) throw Error(next.code);
      this.back = next;
      this.gpu.resetBack();
      if (import.meta.env.MODE === "performance-e2e")
        tailObservation(this.state(), "capture", this.stroke, next.count, through, true);
    }
    while (this.back && performance.now() < deadline) {
      if (!this.job) {
        const input = tail.prepare(this.state(), this.back.id);
        if (input.code !== "ok") throw Error(input.code);
        if (input.token)
          this.job = new LiveJob(
            input,
            this.prepare,
            this.state,
            this.frame,
            this.stroke,
            this.back.id,
          );
      }
      if (this.job) {
        if (!this.job.step(this.gpu.back, color)) continue;
        this.job.dispose();
        this.job = undefined;
      }
      const status = tail.status(this.state(), this.back.id);
      if (status.code !== "ok") throw Error(status.code);
      if (!status.complete) continue;
      this.gpu.publishBack();
      if (import.meta.env.MODE === "performance-e2e")
        tailObservation(this.state(), "publish", this.stroke, status.count, through, status.exact);
      if (this.front) tail.release(this.state(), this.front.id);
      this.front = status;
      this.back = undefined;
      break;
    }
  }
  covers(count: bigint) {
    if (this.front?.count !== count) return false;
    const status = tail.status(this.state(), this.front.id);
    if (status.code !== "ok") throw Error(status.code);
    return status.complete && status.exact;
  }
  dispose() {
    this.job?.dispose();
    this.job = undefined;
    if (this.front) tail.release(this.state(), this.front.id);
    if (this.back) tail.release(this.state(), this.back.id);
    this.front = undefined;
    this.back = undefined;
  }
}
