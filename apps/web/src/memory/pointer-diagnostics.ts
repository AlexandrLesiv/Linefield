import type { ReplyValue } from "./bridge.ts";
interface PointerRecord {
  event: string;
  pointer: number;
  source: string;
  target: "canvas" | "other";
  activeInteraction: string;
  olderThanDown: boolean;
  buttons: number;
  button: number;
  primary: boolean;
  trusted: boolean;
  captureHeld: boolean;
  matchesTrackedPointer: boolean;
  time: number;
}
const records: PointerRecord[] = [];
let dropped = 0;
const events = [
  "pointerdown",
  "pointerup",
  "pointercancel",
  "gotpointercapture",
  "lostpointercapture",
];
export function observePointerLifecycle(canvas: HTMLCanvasElement, read: () => ReplyValue) {
  let pointer: number | undefined;
  let began = 0;
  let retainUntil = 0;
  const observe = (event: Event) => {
    if (!(event instanceof PointerEvent) || !["mouse", "pen", ""].includes(event.pointerType))
      return;
    if (
      event.type === "pointerdown" &&
      event.target === canvas &&
      event.isPrimary &&
      event.button === 0 &&
      read().interaction === 0n
    ) {
      pointer = event.pointerId;
      began = event.timeStamp;
      retainUntil = Infinity;
    }
    if (event.pointerId !== pointer && read().interaction === 0n) return;
    if (read().interaction === 0n && performance.now() > retainUntil) return;
    if (["pointerup", "pointercancel", "lostpointercapture"].includes(event.type))
      retainUntil = performance.now() + 2000;
    if (
      !Number.isSafeInteger(event.pointerId) ||
      !Number.isInteger(event.buttons) ||
      event.buttons < 0 ||
      event.buttons > 255
    )
      return;
    if (!Number.isInteger(event.button) || event.button < -1 || event.button > 5) return;
    if (records.length === 100) {
      records.shift();
      dropped += 1;
    }
    records.push({
      event: event.type,
      pointer: event.pointerId,
      source: event.pointerType || "unknown",
      target: event.target === canvas ? "canvas" : "other",
      activeInteraction: read().interaction.toString(),
      olderThanDown: event.timeStamp < began,
      buttons: event.buttons,
      button: event.button,
      primary: event.isPrimary,
      trusted: event.isTrusted,
      captureHeld: canvas.hasPointerCapture(event.pointerId),
      matchesTrackedPointer: event.pointerId === pointer,
      time: Math.round(performance.now()),
    });
  };
  for (const name of events) document.addEventListener(name, observe, true);
  return () => {
    for (const name of events) document.removeEventListener(name, observe, true);
  };
}
export function pointerDiagnostics() {
  return { records: records.map((record) => ({ ...record })), dropped };
}
