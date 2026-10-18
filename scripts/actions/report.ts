import type { Writable } from "node:stream";
import type { ActionId } from "./catalog.ts";
import type { Execution } from "./process.ts";
import type { Snapshot } from "./fingerprint.ts";
export interface Report {
  schemaVersion: 1;
  jobId: string;
  actionId: ActionId;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  execution: Execution;
  nodeVersion: string;
  toolVersion: string | null;
  platform: string;
  architecture: string;
  revision: string | null;
  dirty: "unavailable";
  before: Snapshot | null;
  after: Snapshot | null;
  freshness: "fresh" | "stale" | "unavailable";
  cancelled: boolean;
}
export async function completeReport(
  report: Omit<Report, "revision" | "cancelled" | "finishedAt" | "durationMs">,
  signal: AbortSignal,
  readRevision: () => Promise<string | null>,
  timing: () => Pick<Report, "finishedAt" | "durationMs">,
): Promise<Report> {
  const revision = await readRevision();
  return { ...report, revision, ...timing(), cancelled: signal.aborted };
}
export function success(report: Report): boolean {
  return !report.cancelled && report.execution.outcome === "passed" && report.freshness === "fresh";
}
export async function writeReport(stream: Writable, report: Report): Promise<boolean> {
  try {
    const text = JSON.stringify(report) + "\n";
    if (Buffer.byteLength(text) > 8192) return false;
    await new Promise<void>((resolve, reject) => {
      const failed = () => reject(Error("report-write-failed"));
      stream.once("error", failed);
      stream.write(text, (error) => {
        if (error) reject(Error("report-write-failed"));
        else {
          stream.removeListener("error", failed);
          resolve();
        }
      });
    });
    return true;
  } catch {
    return false;
  }
}
