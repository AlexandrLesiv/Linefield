import type { BuildIdentity, SafeRecord } from "./schema.ts";
export const captureLimits = {
  events: 4096,
  bytes: 2_097_152,
  durationMs: 30_000,
  metadataReserve: 2048,
} as const;
export type StopReason =
  | "manual"
  | "duration"
  | "events"
  | "bytes"
  | "hidden"
  | "departure"
  | "invalid"
  | "terminal"
  | "sink";
export interface CaptureReport {
  readonly format: "linefield-diagnostics-v1";
  readonly clock: "performance-relative-ms";
  readonly build: Readonly<BuildIdentity>;
  readonly startedMs: number;
  readonly stoppedMs: number;
  readonly reason: StopReason;
  readonly partial: boolean;
  readonly overwrittenPrelude: number;
  readonly dropped: number;
  readonly sinkFailures: number;
  readonly logicalBytesUpperBound: number;
  readonly records: readonly SafeRecord[];
}
export class Capture {
  readonly records: SafeRecord[];
  readonly startedMs: number;
  readonly overwrittenPrelude: number;
  bytes: number;
  constructor(prelude: SafeRecord[], startedMs: number, overwritten: number) {
    this.records = prelude;
    this.startedMs = startedMs;
    this.overwrittenPrelude = overwritten;
    this.bytes =
      captureLimits.metadataReserve + prelude.reduce((sum, record) => sum + record.bytes + 1, 0);
  }
  add(record: SafeRecord): StopReason | undefined {
    if (this.records.length === captureLimits.events) return "events";
    if (this.bytes + record.bytes + 1 > captureLimits.bytes) return "bytes";
    this.records.push(record);
    this.bytes += record.bytes + 1;
    return;
  }
  freeze(
    build: Readonly<BuildIdentity>,
    reason: StopReason,
    now: number,
    dropped: number,
    sinkFailures: number,
  ): CaptureReport {
    return Object.freeze({
      format: "linefield-diagnostics-v1",
      clock: "performance-relative-ms",
      build,
      startedMs: this.startedMs,
      stoppedMs: now,
      reason,
      partial: !["manual", "duration"].includes(reason) || dropped > 0 || sinkFailures > 0,
      overwrittenPrelude: this.overwrittenPrelude,
      dropped,
      sinkFailures,
      logicalBytesUpperBound: this.bytes,
      records: Object.freeze(this.records),
    });
  }
}
