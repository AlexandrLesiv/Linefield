export const metricKeys = [
  "panAttempts",
  "panCopies",
  "panCompleted",
  "panCopiedPixels",
  "panDirtyPixels",
  "panRecipeMisses",
  "panPhaseMisses",
  "panRangeMisses",
  "panCapabilityMisses",
  "panFallbacks",
  "panSkippedDraws",
  "panSkippedComposites",
  "inputCount",
  "inputWindow",
  "submitted",
  "validated",
  "pending",
  "inputPercentile",
  "inputMax",
  "scheduling",
  "queued",
  "active",
  "readyBytes",
  "requests",
  "finerHits",
  "hits",
  "misses",
  "upload",
  "gpuLive",
  "gpuAllocated",
  "cpuMetadata",
  "cpuRetiring",
  "gpuTotal",
  "gpuRetiring",
  "uncertainPages",
  "uncertainTickets",
  "cpu",
  "wasm",
] as const;
export type MetricKey = (typeof metricKeys)[number];
export type MetricValues = Readonly<Partial<Record<MetricKey, number>>>;
export interface MetricSnapshot {
  readonly atMs: number;
  readonly idle: boolean;
  readonly source: "current" | "rebuilding" | "pendingState" | "unavailable";
  readonly values: MetricValues;
}
export function copyMetrics(input: MetricSnapshot): MetricSnapshot {
  const values: Partial<Record<MetricKey, number>> = {};
  for (const key of metricKeys) {
    const value = input.values[key];
    if (
      value !== undefined &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= Number.MAX_SAFE_INTEGER
    )
      values[key] = value;
  }
  return Object.freeze({
    atMs: Number.isFinite(input.atMs) && input.atMs >= 0 ? input.atMs : 0,
    idle: input.idle === true,
    source: ["current", "rebuilding", "pendingState", "unavailable"].includes(input.source)
      ? input.source
      : "unavailable",
    values: Object.freeze(values),
  });
}
/** Activity-fed, trailing-edge throttle; it never requests a render or polls a renderer. */
export class MetricUpdates {
  #last = -Infinity;
  #pending: MetricSnapshot | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  readonly #publish: (snapshot: MetricSnapshot) => void;
  constructor(publish: (snapshot: MetricSnapshot) => void) {
    this.#publish = publish;
  }
  offer(snapshot: MetricSnapshot): void {
    this.#pending = copyMetrics(snapshot);
    if (this.#timer !== undefined) return;
    const delay = Math.max(0, 500 - (performance.now() - this.#last));
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      const pending = this.#pending;
      this.#pending = undefined;
      if (!pending) return;
      this.#last = performance.now();
      this.#publish(pending);
    }, delay);
  }
  stop(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#pending = undefined;
  }
}
