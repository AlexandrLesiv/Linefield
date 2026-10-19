interface Event {
  event: "memory-command";
  request: number;
  session: string;
  command: string;
  outcome: string;
  time: number;
}
const commands = new Set([
  "cancel",
  "pan-begin",
  "pan-end",
  "pan-step",
  "zoom-step",
  "create",
  "enter",
  "read",
  "mapping",
  "metrics",
  "suspend",
  "presented",
  "leave",
  "scene",
  "dispose",
  "display",
  "load",
]);
const outcomes = new Set([
  "stale-interaction",
  "coordinate-overflow",
  "numerical-capacity",
  "ok",
  "noop",
  "invalid",
  "stale-owner",
  "stale-session",
  "stale-mapping",
  "stale-scene",
  "sequence",
  "active",
  "unavailable",
  "disposed",
  "exhausted",
  "failed",
  "soft-target",
]);
const records: Event[] = [];
let request = 0;
let dropped = 0;
export function diagnostic(command: string, outcome: string, session = 0n): void {
  if (!commands.has(command) || !outcomes.has(outcome)) return;
  if (records.length === 100) {
    records.shift();
    dropped += 1;
  }
  records.push({
    event: "memory-command",
    request: ++request,
    session: session.toString(),
    command,
    outcome,
    time: Math.round(performance.now()),
  });
}
// Copied bounded metadata for isolated browser evidence; no global or production sink.
export function diagnosticSnapshot(): Readonly<{ records: Event[]; dropped: number }> {
  return { records: records.map((item) => ({ ...item })), dropped };
}
