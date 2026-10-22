export type PreparationRequest =
  | { kind: "start"; request: bigint; points: Float64Array; parameters: Float64Array }
  | { kind: "next" | "cancel"; request: bigint };
export type PreparationResponse =
  | { kind: "ready" }
  | { kind: "failed"; request: bigint }
  | {
      kind: "page";
      request: bigint;
      data: Float32Array;
      origin: Float64Array;
      done: boolean;
      heap: number;
      duration: number;
    };
export function request(value: unknown): value is PreparationRequest {
  if (
    !value ||
    typeof value !== "object" ||
    !("kind" in value) ||
    !("request" in value) ||
    typeof value.request !== "bigint"
  )
    return false;
  if (value.kind === "next" || value.kind === "cancel") return true;
  return (
    value.kind === "start" &&
    "points" in value &&
    value.points instanceof Float64Array &&
    value.points.byteLength <= 3168 &&
    "parameters" in value &&
    value.parameters instanceof Float64Array &&
    value.parameters.length === 8
  );
}
export function response(value: unknown): value is PreparationResponse {
  if (!value || typeof value !== "object" || !("kind" in value)) return false;
  if (value.kind === "ready") return true;
  if (!("request" in value) || typeof value.request !== "bigint") return false;
  if (value.kind === "failed") return true;
  return (
    value.kind === "page" &&
    "data" in value &&
    value.data instanceof Float32Array &&
    value.data.length <= 6144 &&
    value.data.length % 6 === 0 &&
    "origin" in value &&
    value.origin instanceof Float64Array &&
    value.origin.length === 2 &&
    "done" in value &&
    typeof value.done === "boolean" &&
    "heap" in value &&
    typeof value.heap === "number" &&
    Number.isSafeInteger(value.heap) &&
    value.heap >= 0 &&
    "duration" in value &&
    typeof value.duration === "number" &&
    Number.isFinite(value.duration) &&
    value.duration >= 0
  );
}
