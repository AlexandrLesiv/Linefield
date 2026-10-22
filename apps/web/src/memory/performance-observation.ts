import { geometryMetrics as metrics } from "./geometry-metrics.ts";
import type { GpuRenderer } from "./gpu-renderer.ts";
import type { ReplyValue } from "./bridge.ts";
type RecordValue = Readonly<Record<string, string | number | boolean>>;
type Snapshot = { records: RecordValue[]; dropped: number };
declare global {
  interface Window {
    __linefieldPerfRead?: () => Snapshot;
  }
}
const limit = 2048;
const ring: RecordValue[] = [];
let head = 0,
  dropped = 0,
  sequence = 0;
function append(record: RecordValue) {
  if (ring.length < limit) ring.push(record);
  else {
    ring[head] = record;
    head = (head + 1) % limit;
    dropped++;
  }
}
function identity(s: ReplyValue) {
  return {
    owner: `${s.owner}`,
    session: `${s.session}`,
    scene: `${s.scene}`,
    content: `${s.content}`,
    mapping: `${s.mapping}`,
    interaction: `${s.interaction}`,
  };
}
if (import.meta.env.MODE === "performance-e2e") {
  Object.defineProperty(window, "__linefieldPerfRead", {
    value: () => {
      const records = [...ring.slice(head), ...ring.slice(0, head)].map((record) => ({
        ...record,
      }));
      const value = { records, dropped };
      ring.length = 0;
      head = 0;
      dropped = 0;
      return value;
    },
  });
}
export function inputObservation(s: ReplyValue, command: string) {
  if (import.meta.env.MODE === "performance-e2e")
    append({
      kind: "input",
      request: ++sequence,
      command,
      outcome: s.code,
      ...identity(s),
      time: performance.now(),
    });
}
export function submissionObservation(
  s: ReplyValue,
  epoch: number,
  serial: number,
  complete: boolean,
) {
  if (import.meta.env.MODE === "performance-e2e")
    append({
      kind: "overlay-submit",
      ...identity(s),
      epoch,
      serial,
      complete,
      time: performance.now(),
    });
}
export function publicationObservation(
  s: ReplyValue,
  renderer: GpuRenderer,
  receipt: { id: bigint; through: bigint; key: string },
) {
  if (import.meta.env.MODE === "performance-e2e")
    append({
      kind: "receipt-publish",
      ...identity(s),
      epoch: renderer.epoch,
      receipt: `${receipt.id}`,
      through: `${receipt.through}`,
      receiptContent: receipt.key.split(":")[0] ?? "",
      receiptMapping: receipt.key.split(":")[1] ?? "",
      validatedWatermark: metrics.validatedSubmissions,
      validatedTime: metrics.validatedTime,
      time: performance.now(),
    });
}
export function acknowledgementObservation(
  s: ReplyValue,
  epoch: number,
  receipt: bigint,
  serial: number,
) {
  if (import.meta.env.MODE === "performance-e2e")
    append({
      kind: "receipt-ack",
      ...identity(s),
      epoch,
      receipt: `${receipt}`,
      serial,
      outcome: s.code,
      time: performance.now(),
    });
}
export function cancelledPublication(receipt: bigint) {
  if (import.meta.env.MODE === "performance-e2e")
    append({ kind: "receipt-cancel", receipt: `${receipt}`, time: performance.now() });
}
export function liveOwnerObservation(s: ReplyValue, stroke: bigint) {
  if (import.meta.env.MODE === "performance-e2e")
    append({ kind: "live-owner", ...identity(s), stroke: `${stroke}`, time: performance.now() });
}
export function batchObservation(
  s: ReplyValue,
  receipt: bigint,
  serial: number,
  commands: number,
  bytes: number,
  cpu: number,
  slotWait: number,
  queued: number,
  readyBytes: number,
  reason: string,
) {
  if (import.meta.env.MODE === "performance-e2e")
    append({
      kind: "frame-batch",
      ...identity(s),
      receipt: `${receipt}`,
      serial,
      commands,
      bytes,
      cpu,
      slotWait,
      queued,
      readyBytes,
      reason,
      time: performance.now(),
    });
}
