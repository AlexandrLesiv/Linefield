import { resourceSnapshot } from "./resource-monitor.ts";
interface Event {
  event: "memory-command";
  request: number;
  session: string;
  command: string;
  outcome: string;
  time: number;
}
const commands = new Set([
  "create",
  "enter",
  "metrics",
  "suspend",
  "leave",
  "scene",
  "dispose",
  "display",
  "load",
  "begin",
  "end",
  "cancel",
  "undo",
  "redo",
  "style",
  "view",
]);
const outcomes = new Set([
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
  "capacity",
  "numerical-capacity",
  "coordinate-overflow",
  "stale-interaction",
  "gpu-unavailable",
  "gpu-resource",
  "gpu-target",
  "gpu-buffer",
]);
const records: Event[] = [];
let request = 0;
let dropped = 0;
export function diagnostic(command: string, outcome: string, session = 0n): void {
  if (!commands.has(command)) return;
  if (!outcomes.has(outcome)) {
    if (command !== "display") return;
    outcome = "failed";
  }
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
export function diagnosticSnapshot() {
  return { records: records.map((item) => ({ ...item })), dropped, resources: resourceSnapshot() };
}
