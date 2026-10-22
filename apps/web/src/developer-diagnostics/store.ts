import { BaselineRing } from "./ring.ts";
import { Capture, captureLimits } from "./capture.ts";
import type { CaptureReport, StopReason } from "./capture.ts";
import { safeBuild, safeRecord } from "./schema.ts";
import type { BuildIdentity, DiagnosticEvent } from "./schema.ts";
export interface DiagnosticState {
  readonly capturing: boolean;
  readonly report: CaptureReport | undefined;
  readonly baselineEvents: number;
  readonly baselineBytes: number;
  readonly overwritten: number;
  readonly dropped: number;
  readonly sinkFailures: number;
}
export class DiagnosticsStore {
  /** Tab-lifetime presentation preference; never written to persistent storage. */
  pinned = false;
  readonly #baseline = new BaselineRing();
  readonly #build: Readonly<BuildIdentity>;
  readonly #listeners = new Set<() => void>();
  #capture: Capture | undefined;
  #report: CaptureReport | undefined;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #notification: ReturnType<typeof setTimeout> | undefined;
  #dropped = 0;
  #sinkFailures = 0;
  #captureDropped = 0;
  #captureFailures = 0;
  constructor(build: BuildIdentity) {
    this.#build = safeBuild(build);
  }
  get capturing(): boolean {
    return this.#capture !== undefined;
  }
  get report(): CaptureReport | undefined {
    return this.#report;
  }
  get build(): Readonly<BuildIdentity> {
    return this.#build;
  }
  state(): DiagnosticState {
    return {
      capturing: this.capturing,
      report: this.#report,
      baselineEvents: this.#baseline.size,
      baselineBytes: this.#baseline.bytes,
      overwritten: this.#baseline.overwritten,
      dropped: this.#dropped,
      sinkFailures: this.#sinkFailures,
    };
  }
  subscribe(listener: () => void): () => void {
    if (this.#listeners.size >= 8) throw Error("diagnostics-listener-limit");
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  record(event: DiagnosticEvent, detailed = false): void {
    if (detailed && !this.#capture) return;
    try {
      const record = safeRecord(event);
      if (!record) {
        this.#drop("invalid");
        return;
      }
      detailed ||= record.value.event === "frame.trace" || record.value.command === "append";
      if (detailed && !this.#capture) return;
      if (!detailed) this.#baseline.push(record);
      if (this.#capture) {
        if (performance.now() - this.#capture.startedMs >= captureLimits.durationMs)
          this.stop("duration");
        else {
          const reason = this.#capture.add(record);
          if (reason) this.#drop(reason);
        }
      }
    } catch {
      this.sinkFailure();
    }
  }
  start(): boolean {
    if (this.#capture) return false;
    try {
      const capture = new Capture(
        this.#baseline.snapshot(),
        performance.now(),
        this.#baseline.overwritten,
      );
      const timer = setTimeout(() => this.stop("duration"), captureLimits.durationMs);
      this.#capture = capture;
      this.#timer = timer;
      this.#report = undefined;
      this.#captureDropped = 0;
      this.#captureFailures = 0;
      this.#notify();
      return true;
    } catch {
      this.sinkFailure();
      return false;
    }
  }
  stop(reason: StopReason): void {
    if (!this.#capture) return;
    const capture = this.#capture;
    this.#capture = undefined;
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#report = capture.freeze(
      this.#build,
      reason,
      performance.now(),
      this.#captureDropped,
      this.#captureFailures,
    );
    this.#notify();
  }
  clear(): void {
    if (this.#capture) return;
    this.#report = undefined;
    this.#notify();
  }
  sinkFailure(): void {
    this.#sinkFailures = Math.min(Number.MAX_SAFE_INTEGER, this.#sinkFailures + 1);
    this.#captureFailures++;
    this.stop("sink");
  }
  #drop(reason: StopReason): void {
    this.#dropped = Math.min(Number.MAX_SAFE_INTEGER, this.#dropped + 1);
    this.#captureDropped++;
    this.stop(reason);
  }
  #notify(): void {
    if (this.#notification !== undefined) return;
    this.#notification = setTimeout(() => {
      this.#notification = undefined;
      this.#publish();
    }, 0);
  }
  #publish(): void {
    let failed = false;
    for (const listener of this.#listeners) {
      try {
        listener();
      } catch {
        this.#listeners.delete(listener);
        this.#sinkFailures = Math.min(Number.MAX_SAFE_INTEGER, this.#sinkFailures + 1);
        failed = true;
      }
    }
    if (failed && this.#capture) {
      this.#captureFailures++;
      const capture = this.#capture;
      this.#capture = undefined;
      clearTimeout(this.#timer);
      this.#timer = undefined;
      this.#report = capture.freeze(
        this.#build,
        "sink",
        performance.now(),
        this.#captureDropped,
        this.#captureFailures,
      );
      this.#notify();
    }
  }
}
