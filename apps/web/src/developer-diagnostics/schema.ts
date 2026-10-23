import { preparationCauses } from "./preparation-causes.ts";
import type { PreparationCause } from "./preparation-causes.ts";
export const eventNames = [
  "gesture.begin",
  "gesture.end",
  "gesture.cancel",
  "command.result",
  "history.changed",
  "worker.admitted",
  "worker.started",
  "worker.finished",
  "worker.rejected",
  "frame.published",
  "frame.rejected",
  "surface.lost",
  "surface.recovered",
  "resource.failure",
  "frame.trace",
] as const;
export const origins = [
  "pointer",
  "keyboard",
  "toolbar",
  "lifecycle",
  "worker",
  "renderer",
] as const;
export const outcomes = [
  "accepted",
  "rejected",
  "cancelled",
  "stale",
  "failed",
  "completed",
] as const;
export const commands = [
  "begin",
  "append",
  "end",
  "cancel",
  "undo",
  "redo",
  "view",
  "style",
  "create",
  "enter",
  "metrics",
  "leave",
  "dispose",
  "load",
  "presented",
  "pan.begin",
  "pan.update",
  "pan.end",
  "rotate.begin",
  "rotate.update",
  "rotate.end",
  "resize",
  "resume",
  "suspend",
] as const;
export const failures = [
  "none",
  "capacity",
  "allocation",
  "context",
  "invalid",
  "stale",
  "internal",
] as const;
export const pointers = ["mouse", "pen", "touch", "none"] as const;
export interface DiagnosticEvent {
  readonly event: (typeof eventNames)[number];
  readonly atMs: number;
  readonly origin?: (typeof origins)[number];
  readonly outcome?: (typeof outcomes)[number];
  readonly command?: (typeof commands)[number];
  readonly failure?: (typeof failures)[number];
  readonly cause?: PreparationCause;
  readonly pointer?: (typeof pointers)[number];
  readonly session?: string;
  readonly interaction?: string;
  readonly request?: string;
  readonly operation?: string;
  readonly stroke?: string;
  readonly revision?: string;
  readonly scene?: string;
  readonly mapping?: string;
  readonly admissionRevision?: string;
  readonly admissionScene?: string;
  readonly admissionMapping?: string;
  readonly frame?: string;
  readonly generation?: string;
  readonly count?: number;
  readonly bytes?: number;
  readonly durationMs?: number;
}
const numericKeys = ["count", "bytes", "durationMs"] as const;
const identityKeys = [
  "session",
  "interaction",
  "request",
  "operation",
  "stroke",
  "revision",
  "scene",
  "mapping",
  "admissionRevision",
  "admissionScene",
  "admissionMapping",
  "frame",
  "generation",
] as const;
const u64Max = "18446744073709551615";
/** Opaque shared identities stay lossless; no Number conversion or alias cache. */
export function canonicalIdentity(value: string): boolean {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 20 &&
    !/[^0-9]/.test(value) &&
    (value === "0" || value[0] !== "0") &&
    (value.length < 20 || value <= u64Max)
  );
}
export function diagnosticIdentity(value: bigint): string | undefined {
  if (typeof value !== "bigint" || value < 0n || value > 18446744073709551615n) return;
  const text = value.toString(10);
  return canonicalIdentity(text) ? text : undefined;
}
const enums = {
  origin: origins,
  outcome: outcomes,
  command: commands,
  failure: failures,
  cause: preparationCauses,
  pointer: pointers,
};
export interface SafeRecord {
  readonly value: Readonly<DiagnosticEvent>;
  readonly bytes: number;
}
/** Explicit copying is the privacy boundary; caller objects and unknown properties are never retained. */
export function safeRecord(input: DiagnosticEvent): SafeRecord | undefined {
  const event = input.event;
  const atMs = input.atMs;
  if (
    !eventNames.includes(event) ||
    !Number.isFinite(atMs) ||
    atMs < 0 ||
    atMs > Number.MAX_SAFE_INTEGER
  )
    return;
  const value: DiagnosticEvent = { event, atMs };
  const fields: Record<string, string | number> = { event, atMs };
  for (const key of identityKeys) {
    const item = input[key];
    if (item === undefined) continue;
    if (typeof item !== "string" || !canonicalIdentity(item)) return;
    fields[key] = item;
  }
  for (const key of numericKeys) {
    const item = input[key];
    if (item === undefined) continue;
    if (
      !Number.isFinite(item) ||
      item < 0 ||
      item > Number.MAX_SAFE_INTEGER ||
      (key !== "durationMs" && !Number.isSafeInteger(item))
    )
      return;
    fields[key] = item;
  }
  for (const key of Object.keys(enums) as (keyof typeof enums)[]) {
    const item = input[key];
    if (item === undefined) continue;
    if (!(enums[key] as readonly string[]).includes(item)) return;
    fields[key] = item;
  }
  // Strings are ASCII enums/decimal IDs: exact compact JSON size without input serialization.
  let bytes = 2;
  for (const [key, item] of Object.entries(fields))
    bytes += key.length + 4 + (typeof item === "string" ? item.length + 2 : String(item).length);
  return Object.freeze({ value: Object.freeze(Object.assign(value, fields)), bytes: bytes - 1 });
}
export { safeBuild } from "./build-schema.ts";
export type { BuildIdentity } from "./build-schema.ts";
