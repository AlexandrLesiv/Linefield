type Outcome =
  | "tool-selected"
  | "property-changed"
  | "adjustment-cancelled"
  | "opened"
  | "returned"
  | "preview-opened"
  | "renamed"
  | "removed"
  | "restored"
  | "presentation-failed";
interface Diagnostic {
  event: "prototype-operation";
  outcome: Outcome;
  sequence: number;
  time: number;
}
const records: Diagnostic[] = [];
let sequence = 0;
export function record(outcome: Outcome): void {
  const item: Diagnostic = {
    event: "prototype-operation",
    outcome,
    sequence: ++sequence,
    time: Math.round(performance.now()),
  };
  records.push(item);
  if (records.length > 100) records.shift();
  // No document identifiers, names, artwork, paths or user-entered text.
  if (import.meta.env.DEV) console.debug(item);
}
