import { response } from "./preparation-messages.ts";
import type { PreparationResponse, PreparationRequest } from "./preparation-messages.ts";
import { loadPreparation, preparationHeap } from "./preparation-loader.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
type Input = { points: Float64Array; parameters: Float64Array };
type Page = Extract<PreparationResponse, { kind: "page" }>;
type Waiter = {
  resolve: (value: Page) => void;
  reject: () => void;
  timer: ReturnType<typeof setTimeout>;
};
const turn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
export class PreparationExecutor {
  private worker: Worker | undefined;
  private ready = false;
  private disposed = false;
  private failures = 0;
  private serial = 0n;
  private waiting = new Map<bigint, Waiter>();
  private active = new Set<bigint>();
  private queued = 0;
  constructor() {
    this.launch();
  }
  private launch() {
    if (this.disposed || this.failures > 1) return;
    try {
      this.worker = new Worker(new URL("./preparation-worker.ts", import.meta.url), {
        type: "module",
      });
      this.worker.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (!response(data)) {
          this.fail();
          return;
        }
        if (data.kind === "ready") {
          this.ready = true;
          return;
        }
        const waiter = this.waiting.get(data.request);
        if (!waiter) return;
        clearTimeout(waiter.timer);
        this.waiting.delete(data.request);
        if (data.kind === "failed") {
          this.fail();
          waiter.reject();
          return;
        }
        metrics.workerPages++;
        metrics.workerHeap = data.heap;
        metrics.workerMilliseconds += data.duration;
        waiter.resolve(data);
      };
      this.worker.onerror = () => this.fail();
      this.worker.onmessageerror = () => this.fail();
    } catch {
      this.fail();
    }
  }
  private fail() {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    if (!this.disposed) {
      this.failures++;
      metrics.failures++;
    }
    for (const waiter of this.waiting.values()) {
      clearTimeout(waiter.timer);
      waiter.reject();
    }
    this.waiting.clear();
    this.active.clear();
    metrics.active = 0;
    metrics.preparationCopies = this.queued * 8192;
    metrics.workerHeap = 0;
    if (!this.disposed && this.failures === 1) this.launch();
  }
  private message(request: PreparationRequest) {
    return new Promise<Page>((resolve, reject) => {
      if (!this.worker || !this.ready) {
        reject(Error("worker-unavailable"));
        return;
      }
      const timer = setTimeout(() => this.fail(), 10000);
      this.waiting.set(request.request, {
        resolve,
        reject: () => reject(Error("worker-unavailable")),
        timer,
      });
      // Copies remain local for bounded fallback; transfer only fresh immutable copies.
      if (request.kind === "start") {
        const points = request.points.slice(),
          parameters = request.parameters.slice();
        this.worker.postMessage({ ...request, points, parameters }, [
          points.buffer,
          parameters.buffer,
        ]);
      } else this.worker.postMessage(request);
    });
  }
  async *pages(input: Input, urgent = false): AsyncGenerator<Page> {
    if (this.disposed) throw Error("disposed");
    if (this.queued >= 256) throw Error("capacity");
    this.queued++;
    metrics.queue = this.queued;
    metrics.preparationCopies = (this.queued + this.active.size) * 8192;
    const started = performance.now();
    while (!this.disposed && this.failures < 2 && (!this.ready || this.active.size >= 8)) {
      if (urgent) break;
      if (performance.now() - started > 10000) {
        this.fail();
        break;
      }
      await turn();
    }
    this.queued--;
    metrics.queue = this.queued;
    metrics.preparationCopies = (this.queued + this.active.size) * 8192;
    if (this.disposed) throw Error("disposed");
    const id = ++this.serial;
    metrics.jobs++;
    let worker = this.ready && !urgent;
    if (worker) {
      this.active.add(id);
      metrics.active = this.active.size;
      metrics.preparationCopies = (this.queued + this.active.size) * 8192;
    }
    let local: Awaited<ReturnType<typeof loadPreparation>> | undefined;
    let fallback: ReturnType<Awaited<ReturnType<typeof loadPreparation>>> | undefined;
    let first = true;
    try {
      for (;;) {
        if (this.disposed) throw Error("disposed");
        let value: Page;
        if (worker) {
          try {
            value = await this.message(
              first ? { kind: "start", request: id, ...input } : { kind: "next", request: id },
            );
          } catch {
            throw Error("worker-unavailable");
          }
        } else {
          local ??= await loadPreparation();
          if (this.disposed) throw Error("disposed");
          fallback ??= local(input.points, input.parameters);
          await turn();
          if (this.disposed) throw Error("disposed");
          const start = performance.now(),
            result = fallback.nextPage();
          try {
            value = {
              kind: "page",
              request: id,
              data: result.data,
              origin: result.origin,
              done: result.done,
              heap: preparationHeap(),
              duration: performance.now() - start,
            };
          } finally {
            result.free();
          }
          metrics.fallbackPages++;
          metrics.fallbackHeap = value.heap;
        }
        first = false;
        metrics.readyBytes += value.data.byteLength + value.origin.byteLength;
        try {
          yield value;
        } finally {
          metrics.readyBytes -= value.data.byteLength + value.origin.byteLength;
        }
        if (value.done) break;
      }
    } finally {
      fallback?.free();
      this.active.delete(id);
      metrics.active = this.active.size;
      metrics.preparationCopies = (this.queued + this.active.size) * 8192;
      if (worker && this.worker) this.worker.postMessage({ kind: "cancel", request: id });
    }
  }
  dispose() {
    this.disposed = true;
    this.fail();
  }
}
