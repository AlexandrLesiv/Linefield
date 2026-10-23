import * as host from "./preparation-host.ts";
import { response } from "./preparation-messages.ts";
import type { PreparationRequest } from "./preparation-messages.ts";
import type { Input, Page, Waiter, JobObservation } from "./preparation-job.ts";
import { loadPreparation } from "./preparation-loader.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { PreparationCause } from "../developer-diagnostics/preparation-causes.ts";
import type { PreparationJob } from "../developer-diagnostics/preparation-observation.ts";
import { PreparationObservation } from "../developer-diagnostics/preparation-observation.ts";
export class PreparationExecutor {
  private diagnostics = new PreparationObservation();
  readonly diagnosticGeneration = this.diagnostics.generation;
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
      this.worker = host.launchPreparation(this.diagnostics);
      this.worker.onmessage = ({ data }: MessageEvent<unknown>) => {
        if (!response(data)) {
          this.fail("malformed-response");
          return;
        }
        if (data.kind === "ready") {
          this.ready = true;
          return;
        }
        const waiter = this.waiting.get(data.request);
        if (!waiter) {
          this.diagnostics.late(data.request);
          return;
        }
        clearTimeout(waiter.timer);
        this.waiting.delete(data.request);
        if (data.kind === "failed") {
          this.fail("worker-failed");
          waiter.reject("worker-failed");
          return;
        }
        metrics.workerPages++;
        metrics.workerHeap = data.heap;
        metrics.workerMilliseconds += data.duration;
        waiter.resolve(data);
      };
      this.worker.onerror = () => this.fail("worker-error");
      this.worker.onmessageerror = () => this.fail("message-error");
    } catch {
      this.fail("worker-error");
    }
  }
  private fail(cause: PreparationCause) {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = false;
    this.diagnostics.failure(cause, this.disposed);
    if (!this.disposed) {
      this.failures++;
      metrics.failures++;
    }
    for (const waiter of this.waiting.values()) {
      clearTimeout(waiter.timer);
      waiter.reject(cause);
    }
    this.waiting.clear();
    this.active.clear();
    metrics.active = 0;
    metrics.preparationCopies = this.queued * 8192;
    metrics.workerHeap = 0;
    if (!this.disposed && this.failures === 1) this.launch();
  }
  private message(request: PreparationRequest, job: PreparationJob | undefined) {
    return new Promise<Page>((resolve, reject) => {
      if (!this.worker || !this.ready) {
        job?.fail("dispatch-unavailable");
        reject(Error("worker-unavailable"));
        return;
      }
      const timer = setTimeout(() => this.fail("timeout"), 10000);
      this.waiting.set(request.request, {
        resolve,
        reject: (cause) => {
          job?.fail(cause);
          reject(Error("worker-unavailable"));
        },
        timer,
      });
      try {
        host.dispatchPreparation(this.worker, request, job, this.diagnostics.workerFailure);
      } catch (error) {
        job?.fail("dispatch-failed");
        throw error;
      }
    });
  }
  async *pages(input: Input, urgent = false, observation?: JobObservation) {
    const job = this.diagnostics.job(observation);
    if (this.disposed) {
      job?.reject("disposed");
      throw Error("disposed");
    }
    if (this.queued >= 256) {
      job?.reject("capacity");
      throw Error("capacity");
    }
    this.queued++;
    metrics.queue = this.queued;
    metrics.preparationCopies = (this.queued + this.active.size) * 8192;
    const started = performance.now();
    while (!this.disposed && this.failures < 2 && (!this.ready || this.active.size >= 8)) {
      if (urgent) break;
      if (performance.now() - started > 10000) {
        this.fail("timeout");
        break;
      }
      await host.preparationTurn();
    }
    this.queued--;
    metrics.queue = this.queued;
    metrics.preparationCopies = (this.queued + this.active.size) * 8192;
    if (this.disposed) {
      job?.reject("disposed");
      throw Error("disposed");
    }
    const id = ++this.serial;
    job?.admitted(id);
    metrics.jobs++;
    let worker = this.ready && !urgent;
    if (worker) {
      this.active.add(id);
      metrics.active = this.active.size;
      metrics.preparationCopies = (this.queued + this.active.size) * 8192;
    }
    let local: Awaited<ReturnType<typeof loadPreparation>> | undefined;
    let fallback: ReturnType<Awaited<ReturnType<typeof loadPreparation>>> | undefined;
    let first = true,
      completed = false;
    try {
      for (;;) {
        if (this.disposed) throw Error("disposed");
        let value: Page;
        if (worker) {
          try {
            value = await this.message(
              first ? { kind: "start", request: id, ...input } : { kind: "next", request: id },
              job,
            );
          } catch {
            throw Error("worker-unavailable");
          }
        } else {
          local ??= await loadPreparation();
          if (this.disposed) throw Error("disposed");
          if (first) job?.started(false);
          fallback ??= local(input.points, input.parameters);
          await host.preparationTurn();
          if (this.disposed) throw Error("disposed");
          value = host.fallbackPage(fallback, id);
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
        if (value.done) {
          completed = true;
          break;
        }
      }
    } catch (error) {
      job?.fail(this.disposed ? "disposed" : "preparation-failed");
      throw error;
    } finally {
      job?.finish(completed, this.disposed ? "disposed" : "cancelled");
      fallback?.free();
      this.active.delete(id);
      metrics.active = this.active.size;
      metrics.preparationCopies = (this.queued + this.active.size) * 8192;
      if (worker && this.worker) this.worker.postMessage({ kind: "cancel", request: id });
    }
  }
  dispose() {
    this.disposed = true;
    this.fail("disposed");
  }
}
