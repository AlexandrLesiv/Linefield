import type { MetricValues } from "./metrics.ts";
/** Twenty 50ms buckets; no event/sample trace is retained. */
export class MetricWindow {
  readonly #ticks = new Float64Array(20).fill(-1);
  readonly #submitted = new Float64Array(20);
  readonly #validated = new Float64Array(20);
  readonly #upload = new Float64Array(20);
  readonly #inputs = new Float64Array(20);
  readonly #times = new Float64Array(512);
  readonly #durations = new Float64Array(512);
  #head = 0;
  #size = 0;
  #overflowAt = -Infinity;
  #started = 0;
  #previousUploads = 0;
  reset(now: number, uploadTotal: number): void {
    this.#ticks.fill(-1);
    this.#head = this.#size = 0;
    this.#started = now;
    this.#previousUploads = uploadTotal;
    this.#overflowAt = -Infinity;
  }
  input(start: number, now: number): void {
    const bucket = this.#bucket(now);
    this.#inputs[bucket] = (this.#inputs[bucket] ?? 0) + 1;
    if (this.#size === 512 && now - (this.#times[this.#head] ?? 0) <= 1000) this.#overflowAt = now;
    this.#durations[this.#head] = now - start;
    this.#times[this.#head] = now;
    this.#head = (this.#head + 1) % 512;
    this.#size = Math.min(512, this.#size + 1);
  }
  render(kind: "submitted" | "validated", now: number, uploadTotal: number): void {
    const index = this.#bucket(now);
    const counts = kind === "submitted" ? this.#submitted : this.#validated;
    counts[index] = (counts[index] ?? 0) + 1;
    if (kind === "submitted") {
      this.#upload[index] =
        (this.#upload[index] ?? 0) + Math.max(0, uploadTotal - this.#previousUploads);
      this.#previousUploads = uploadTotal;
    }
  }
  snapshot(now: number): MetricValues {
    let submitted = 0,
      validated = 0,
      upload = 0,
      inputCount = 0;
    for (let i = 0; i < 20; i++) {
      const age = Math.floor(now / 50) - (this.#ticks[i] ?? -1);
      if (age < 0 || age >= 20) continue;
      submitted += this.#submitted[i] ?? 0;
      validated += this.#validated[i] ?? 0;
      upload += this.#upload[i] ?? 0;
      inputCount += this.#inputs[i] ?? 0;
    }
    const samples: number[] = [];
    for (let i = 0; i < this.#size; i++)
      if (now - (this.#times[i] ?? 0) <= 1000) samples.push(this.#durations[i] ?? 0);
    samples.sort((a, b) => a - b);
    return {
      ...(now - this.#started >= 1000 ? { submitted, validated, upload } : {}),
      inputCount,
      inputWindow: Math.min(1000, now - this.#started),
      ...(samples.length && now - this.#overflowAt > 1000
        ? {
            inputP95: samples[Math.ceil(samples.length * 0.95) - 1] ?? 0,
            inputMax: samples.at(-1) ?? 0,
          }
        : {}),
    };
  }
  #bucket(now: number): number {
    const tick = Math.floor(now / 50),
      index = tick % 20;
    if (this.#ticks[index] !== tick) {
      this.#ticks[index] = tick;
      for (const values of [this.#submitted, this.#validated, this.#upload, this.#inputs])
        values[index] = 0;
    }
    return index;
  }
}
