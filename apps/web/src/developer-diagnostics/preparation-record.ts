import { diagnosticsStore } from "./runtime-port.ts";
import type { DiagnosticEvent } from "./schema.ts";
export function preparationRecord(event: DiagnosticEvent, detailed = true): void {
  try {
    diagnosticsStore.record(event, detailed);
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
export function observePreparation(action: () => void): void {
  try {
    action();
  } catch {
    diagnosticsStore.sinkFailure();
  }
}
const keys = [
  "generation",
  "request",
  "operation",
  "stroke",
  "session",
  "frame",
  "admissionRevision",
  "admissionScene",
  "admissionMapping",
] as const;
type IdentityKey = (typeof keys)[number];
export function preparationIds(
  values: Partial<Record<IdentityKey, string | undefined>>,
): Partial<Record<IdentityKey, string>> {
  const result: Partial<Record<IdentityKey, string>> = {};
  for (const key of keys) {
    const value = values[key];
    if (value !== undefined) result[key] = value;
  }
  return result;
}
