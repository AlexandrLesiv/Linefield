import type { ReplyValue, MappingValue } from "./bridge.ts";
import type { CommandTiming } from "./command-timing.ts";
import { edit } from "./edit-bridge.ts";
export interface Commands {
  read(): ReplyValue;
  run(action: (state: ReplyValue) => ReplyValue, timing?: CommandTiming): ReplyValue | undefined;
  view(): MappingValue;
  fail(): void;
}
export interface Contact {
  pointer: number;
  source: string;
  mode: "ink" | "pan" | "rotate";
  token: ReplyValue;
  time: number;
  next: bigint;
  sequence: bigint;
  pending: boolean;
  releaseTime: number;
  x: number;
  y: number;
  pressure: number;
}
export function contactState(canvas: HTMLCanvasElement, commands: Commands) {
  let current: Contact | undefined;
  function release() {
    const old = current;
    current = undefined;
    if (!old) return;
    try {
      if (canvas.hasPointerCapture(old.pointer)) canvas.releasePointerCapture(old.pointer);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "NotFoundError")) commands.fail();
    }
  }
  function cancel(cause: Parameters<typeof edit.cancel>[1] = "blur") {
    const old = current;
    release();
    if (old) commands.run(() => edit.cancel(old.token, cause));
  }
  return {
    get current() {
      return current;
    },
    set(value: Contact) {
      current = value;
    },
    release,
    cancel,
    matches(e: PointerEvent) {
      return (
        current &&
        e.pointerId === current.pointer &&
        e.timeStamp >= (current.pending ? current.releaseTime : current.time)
      );
    },
    sync() {
      if (current && commands.read().interaction !== current.token.interaction) release();
    },
  };
}
export function localPoint(canvas: HTMLCanvasElement, e: PointerEvent): [number, number] {
  const r = canvas.getBoundingClientRect();
  return [e.clientX - r.left, e.clientY - r.top];
}
export function editable(event: KeyboardEvent) {
  return (
    event.isComposing ||
    event.defaultPrevented ||
    (event.target instanceof HTMLElement &&
      Boolean(
        event.target.closest(
          "input,textarea,select,[contenteditable='true'],[role='textbox'],[role='dialog']",
        ),
      ))
  );
}
