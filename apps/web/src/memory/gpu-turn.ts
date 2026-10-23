type Task = { handle: number };
type Wake = {
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: Error) => void;
  task: Task | undefined;
};
// One awaited wake per GPU owner. A task grants neither a slot nor validation.
export class GpuTurn {
  private pending: Wake | undefined;
  private delay = 4;
  private hiddenAt: number | undefined;
  private listening = false;
  private signal: AbortSignal;
  private excludeHidden: (start: number, end: number) => void;
  constructor(signal: AbortSignal, excludeHidden: (start: number, end: number) => void) {
    this.signal = signal;
    this.excludeHidden = excludeHidden;
  }
  track() {
    if (!this.listening && !this.signal.aborted) {
      this.listening = true;
      if (document.visibilityState === "hidden") this.hiddenAt = performance.now();
      document.addEventListener("visibilitychange", this.visibility);
      this.signal.addEventListener("abort", this.abort, { once: true });
    }
  }
  wait() {
    if (this.signal.aborted) return Promise.reject(Error("disposed"));
    this.track();
    if (this.pending) return this.pending.promise;
    let resolve = () => {},
      reject = (_error: Error) => {};
    const promise = new Promise<void>((done, failed) => {
      resolve = done;
      reject = failed;
    });
    const wake: Wake = { promise, resolve, reject, task: undefined };
    this.pending = wake;
    this.arm(wake);
    return promise;
  }
  progress() {
    this.delay = 4;
    const wake = this.pending;
    if (wake) {
      this.cancel(wake);
      if (document.visibilityState === "hidden") {
        this.visibility();
        return;
      }
      this.pending = undefined;
      wake.resolve();
    }
  }
  private cancel(wake: Wake) {
    const task = wake.task;
    wake.task = undefined;
    if (task) clearTimeout(task.handle);
  }
  private arm(wake: Wake) {
    if (this.signal.aborted || wake !== this.pending || wake.task) return;
    if (document.visibilityState === "hidden") {
      this.visibility();
      return;
    }
    const task: Task = { handle: 0 };
    wake.task = task;
    task.handle = window.setTimeout(() => {
      if (this.pending !== wake || wake.task !== task || this.signal.aborted) return;
      if (document.visibilityState === "hidden") {
        this.visibility();
        return;
      }
      wake.task = undefined;
      this.pending = undefined;
      this.delay = Math.min(32, this.delay * 2);
      wake.resolve();
    }, this.delay);
  }
  private visibleTime(now: number) {
    if (this.hiddenAt === undefined) return false;
    this.excludeHidden(this.hiddenAt, now);
    this.hiddenAt = undefined;
    return true;
  }
  private visibility = () => {
    if (this.signal.aborted) return;
    const now = performance.now();
    if (document.visibilityState === "hidden") {
      this.hiddenAt ??= now;
      if (this.pending) this.cancel(this.pending);
    } else if (this.visibleTime(now)) {
      this.delay = 4;
      if (this.pending) this.arm(this.pending);
    }
  };
  private abort = () => {
    this.visibleTime(performance.now());
    document.removeEventListener("visibilitychange", this.visibility);
    this.signal.removeEventListener("abort", this.abort);
    const wake = this.pending;
    this.pending = undefined;
    if (wake) {
      this.cancel(wake);
      wake.reject(Error("disposed"));
    }
  };
}
