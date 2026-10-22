export const eventNames = [
  "gesture.begin",
  "gesture.end",
  "gesture.cancel",
  "command.result",
  "history.changed",
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
  readonly pointer?: (typeof pointers)[number];
  readonly session?: number;
  readonly interaction?: number;
  readonly request?: number;
  readonly operation?: number;
  readonly stroke?: number;
  readonly revision?: number;
  readonly frame?: number;
  readonly generation?: number;
  readonly count?: number;
  readonly bytes?: number;
  readonly durationMs?: number;
}
const numericKeys = [
  "session",
  "interaction",
  "request",
  "operation",
  "stroke",
  "revision",
  "frame",
  "generation",
  "count",
  "bytes",
  "durationMs",
] as const;
const enums = {
  origin: origins,
  outcome: outcomes,
  command: commands,
  failure: failures,
  pointer: pointers,
};
export interface SafeRecord {
  readonly value: Readonly<DiagnosticEvent>;
  readonly bytes: number;
}
/** Explicit copying is the privacy boundary; caller objects and unknown properties are never retained. */
export function safeRecord(input: DiagnosticEvent): SafeRecord | undefined {
  if (
    !eventNames.includes(input.event) ||
    !Number.isFinite(input.atMs) ||
    input.atMs < 0 ||
    input.atMs > Number.MAX_SAFE_INTEGER
  )
    return;
  const value: DiagnosticEvent = { event: input.event, atMs: input.atMs };
  const fields: Record<string, string | number> = { event: input.event, atMs: input.atMs };
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
  // All strings are ASCII enums; this is exact compact JSON size without serializing on input.
  let bytes = 2;
  for (const [key, item] of Object.entries(fields))
    bytes += key.length + 4 + (typeof item === "string" ? item.length + 2 : String(item).length);
  return Object.freeze({ value: Object.freeze(Object.assign(value, fields)), bytes: bytes - 1 });
}
export interface BuildIdentity {
  readonly app: string;
  readonly engine: string;
}
export function safeBuild(build: BuildIdentity): Readonly<BuildIdentity> {
  const clean = (value: string) => (/^[a-zA-Z0-9_-]{1,96}$/.test(value) ? value : "unavailable");
  return Object.freeze({ app: clean(build.app), engine: clean(build.engine) });
}
