import { preparationHeap } from "./preparation-loader.ts";
import type { loadPreparation } from "./preparation-loader.ts";
import type { Page } from "./preparation-job.ts";
import type { PreparationRequest } from "./preparation-messages.ts";
import type {
  PreparationJob,
  PreparationFailure,
  PreparationObservation,
} from "../developer-diagnostics/preparation-observation.ts";
export function launchPreparation(observation: PreparationObservation): Worker {
  observation.launched();
  return new Worker(new URL("./preparation-worker.ts", import.meta.url), { type: "module" });
}
/** Retain local fallback input; transfer only fresh immutable copies to the worker. */
export function dispatchPreparation(
  worker: Worker,
  request: PreparationRequest,
  job?: PreparationJob,
  failure?: PreparationFailure,
): void {
  if (request.kind === "start") {
    const points = request.points.slice(),
      parameters = request.parameters.slice();
    worker.postMessage({ ...request, points, parameters }, [points.buffer, parameters.buffer]);
    job?.started(true, failure);
  } else worker.postMessage(request);
}
type Fallback = ReturnType<Awaited<ReturnType<typeof loadPreparation>>>;
/** Owns the temporary Wasm result exactly until its data has been copied. */
export function fallbackPage(fallback: Fallback, request: bigint): Page {
  const start = performance.now(),
    result = fallback.nextPage();
  try {
    return {
      kind: "page",
      request,
      data: result.data,
      origin: result.origin,
      done: result.done,
      heap: preparationHeap(),
      duration: performance.now() - start,
    };
  } finally {
    result.free();
  }
}

export const preparationTurn = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
