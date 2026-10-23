import { diagnosticsStore } from "./runtime-port.ts";
import { diagnosticIdentity } from "./schema.ts";
import type { JobObservation } from "../memory/preparation-job.ts";
import {
  preparationRecord as record,
  preparationIds as ids,
  observePreparation,
} from "./preparation-record.ts";
import type { PreparationCause } from "./preparation-causes.ts";
import { cancellation } from "./preparation-causes.ts";
let executorSerial = 0n;
export interface PreparationFailure {
  cause?: PreparationCause;
}
export class PreparationObservation {
  readonly generation = this.identity();
  #failed = false;
  workerFailure: PreparationFailure = {};
  launched(): void {
    this.workerFailure = {};
  }
  private identity(): string | undefined {
    if (executorSerial === 18446744073709551615n) {
      diagnosticsStore.sinkFailure();
      return;
    }
    return diagnosticIdentity(++executorSerial);
  }
  job(observation?: JobObservation): PreparationJob | undefined {
    return diagnosticsStore.capturing || observation
      ? new PreparationJob(this.generation, observation)
      : undefined;
  }
  late(request: bigint): void {
    if (!diagnosticsStore.capturing) return;
    record({
      event: "worker.rejected",
      atMs: performance.now(),
      ...ids({ generation: this.generation, request: diagnosticIdentity(request) }),
      origin: "worker",
      outcome: "stale",
      failure: "stale",
      cause: "stale",
    });
  }
  failure(cause: PreparationCause, disposed: boolean): void {
    this.workerFailure.cause ??= cause;
    if (this.#failed || disposed) return;
    this.#failed = true;
    record(
      {
        event: "resource.failure",
        atMs: performance.now(),
        ...ids({ generation: this.generation }),
        origin: "worker",
        outcome: "failed",
        failure: "internal",
        cause,
      },
      false,
    );
  }
}
export class PreparationJob {
  readonly #generation: string | undefined;
  readonly #observation: JobObservation | undefined;
  #failure: PreparationFailure | undefined;
  #request: string | undefined;
  #cause: PreparationCause | undefined;
  #started: number | undefined;
  #worker = false;
  #finished = false;
  constructor(generation: string | undefined, observation: JobObservation | undefined) {
    this.#generation = generation;
    this.#observation = observation;
  }
  admitted(request: bigint): void {
    this.#request = diagnosticIdentity(request);
    observePreparation(() => this.#observation?.admitted(request));
  }
  started(worker: boolean, failure?: PreparationFailure): void {
    this.#worker = worker;
    this.#failure = worker ? failure : undefined;
    this.#started = performance.now();
    if (diagnosticsStore.capturing)
      record({
        event: "worker.started",
        atMs: this.#started,
        ...ids({ generation: this.#generation, request: this.#request }),
        origin: worker ? "worker" : "renderer",
      });
  }
  fail(cause: PreparationCause): void {
    const first = (this.#cause ??= this.#failure?.cause ?? cause);
    observePreparation(() => this.#observation?.cause(first));
  }
  reject(cause: PreparationCause): void {
    this.fail(cause);
    this.finish(false, cause);
  }
  finish(completed: boolean, fallback: PreparationCause): void {
    if (this.#finished) return;
    this.#finished = true;
    if (!completed) this.fail(this.#cause ?? fallback);
    if (!diagnosticsStore.capturing) return;
    const cause = this.#cause ?? fallback;
    record({
      event: completed ? "worker.finished" : "worker.rejected",
      atMs: performance.now(),
      ...ids({ generation: this.#generation, request: this.#request }),
      origin: this.#worker ? "worker" : "renderer",
      outcome: completed ? "completed" : cancellation(cause) ? "cancelled" : "failed",
      ...(completed ? {} : { cause }),
      ...(this.#started === undefined
        ? {}
        : { durationMs: Math.max(0, performance.now() - this.#started) }),
    });
  }
}
