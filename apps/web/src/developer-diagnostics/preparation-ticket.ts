import { diagnosticsStore } from "./runtime-port.ts";
import { diagnosticIdentity } from "./schema.ts";
import type { DiagnosticEvent } from "./schema.ts";
import type { ReplyValue } from "../memory/bridge.ts";
import type { JobObservation } from "../memory/preparation-job.ts";
import { preparationRecord as record, preparationIds as ids } from "./preparation-record.ts";
import { cancellation } from "./preparation-causes.ts";
import type { PreparationCause } from "./preparation-causes.ts";
export function preparationTicket(
  reply: ReplyValue,
  token: bigint,
  stroke: bigint,
  generation: string | undefined,
  frame: bigint,
): PreparationTicket | undefined {
  if (!diagnosticsStore.capturing) return;
  const metadata: Readonly<DiagnosticEvent> = Object.freeze({
    event: "worker.admitted",
    atMs: performance.now(),
    ...ids({
      session: diagnosticIdentity(reply.session),
      admissionRevision: diagnosticIdentity(reply.content),
      admissionScene: diagnosticIdentity(reply.scene),
      admissionMapping: diagnosticIdentity(reply.mapping),
      frame: diagnosticIdentity(frame),
      operation: diagnosticIdentity(token),
      stroke: diagnosticIdentity(stroke),
      generation,
    }),
  });
  return new PreparationTicket(metadata);
}
class PreparationTicket implements JobObservation {
  readonly #metadata: Readonly<DiagnosticEvent>;
  #request: string | undefined;
  #cause: PreparationCause | undefined;
  #finished = false;
  constructor(metadata: Readonly<DiagnosticEvent>) {
    this.#metadata = metadata;
  }
  admitted(request: bigint): void {
    this.#request = diagnosticIdentity(request);
    if (!diagnosticsStore.capturing) return;
    record({
      ...this.#metadata,
      atMs: performance.now(),
      origin: "worker",
      ...ids({ request: this.#request }),
    });
  }
  cause(cause: PreparationCause): void {
    this.#cause ??= cause;
  }
  abandoned(count: number): void {
    if (this.#finished) return;
    this.cause("cancelled");
    this.outcome("rejected", count);
  }
  outcome(outcome: "completed" | "stale" | "rejected", count: number): void {
    if (this.#finished) return;
    this.#finished = true;
    if (!diagnosticsStore.capturing) return;
    const cause = this.#cause ?? (outcome === "stale" ? "stale" : "preparation-failed");
    record({
      ...this.#metadata,
      event: outcome === "completed" ? "worker.finished" : "worker.rejected",
      atMs: performance.now(),
      origin: "worker",
      outcome:
        outcome === "completed"
          ? "completed"
          : cancellation(cause)
            ? "cancelled"
            : cause === "stale"
              ? "stale"
              : "failed",
      ...(outcome === "completed" ? {} : { cause }),
      count,
      ...ids({ request: this.#request }),
    });
  }
}
