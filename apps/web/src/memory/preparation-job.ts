import type { PreparationCause } from "../developer-diagnostics/preparation-causes.ts";
import type { PreparationResponse } from "./preparation-messages.ts";
export type Input = { points: Float64Array; parameters: Float64Array };
export type Page = Extract<PreparationResponse, { kind: "page" }>;
export type JobObservation = {
  admitted(request: bigint): void;
  cause(cause: PreparationCause): void;
};
export type Waiter = {
  resolve: (value: Page) => void;
  reject: (cause: PreparationCause) => void;
  timer: ReturnType<typeof setTimeout>;
};
