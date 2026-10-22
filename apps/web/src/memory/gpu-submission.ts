import { gpuTurn } from "./gpu-turn.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
type Pending = { sync: WebGLSync; serial: number; started: number };
export class GpuSubmission {
  private pending: Pending[] = [];
  private issued = 0;
  private reserved = 0;
  private validated = 0;
  private disposed = false;
  private lifetime = new AbortController();
  private observed = performance.now();
  private gl: WebGL2RenderingContext;
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }
  get idle() {
    return this.pending.length === 0 && this.reserved === 1;
  }
  ready() {
    if (this.disposed || this.gl.isContextLost()) throw Error("gpu-resource");
    const now = performance.now(),
      resumed = now - this.observed > 1000;
    this.observed = now;
    let all = true;
    for (const item of this.pending) {
      const status = this.gl.clientWaitSync(item.sync, 0, 0);
      if (status === this.gl.WAIT_FAILED) throw Error("gpu-resource");
      if (status !== this.gl.ALREADY_SIGNALED && status !== this.gl.CONDITION_SATISFIED) {
        if (resumed || document.visibilityState === "hidden") item.started = now;
        if (now - item.started > 10000) throw Error("gpu-resource");
        all = false;
      }
    }
    // Validate only after ALL submitted work drains. A later pending batch would make
    // getError a possible driver wait even if the first fence had already signaled.
    if (all && this.pending.length && this.reserved === 0) {
      const last = this.pending[this.pending.length - 1];
      if (this.gl.getError() !== this.gl.NO_ERROR) throw Error("gpu-resource");
      for (const item of this.pending) this.gl.deleteSync(item.sync);
      this.pending = [];
      this.validated = last?.serial ?? this.validated;
      metrics.validatedSubmissions = this.validated;
      metrics.validatedTime = performance.now();
    }
    metrics.gpuInFlight = this.pending.length;
    return this.pending.length + this.reserved < 2;
  }
  acquire() {
    if (!this.ready()) return false;
    this.reserved++;
    return true;
  }
  submit() {
    if (this.reserved) this.reserved--;
    if (this.pending.length >= 2) throw Error("gpu-queue");
    const sync = this.gl.fenceSync(this.gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) throw Error("gpu-resource");
    const serial = ++this.issued;
    this.pending.push({ sync, serial, started: performance.now() });
    this.gl.flush();
    metrics.gpuInFlight = this.pending.length;
    metrics.submittedTime = performance.now();
    return serial;
  }
  async wait(serial: number) {
    while (!this.disposed && this.validated < serial) {
      this.ready();
      if (this.validated < serial) await this.turn();
    }
    if (this.disposed) throw Error("disposed");
  }
  turn() {
    return gpuTurn(this.lifetime.signal);
  }
  dispose() {
    this.lifetime.abort();
    this.disposed = true;
    for (const item of this.pending) this.gl.deleteSync(item.sync);
    this.pending = [];
    this.reserved = 0;
    metrics.gpuInFlight = 0;
  }
}
