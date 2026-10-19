import { penBridge } from "./pen-bridge.ts";
import { inputDiagnostic } from "./input-diagnostics.ts";
import type { ReplyValue } from "./bridge.ts";
import type { EditorCommands } from "./pen-input.ts";
export interface PenContact {
  pointer: number;
  token: ReplyValue;
  time: number;
  next: bigint;
  source: string;
  max: number;
  pending: boolean;
  releaseTime: number;
}
export function contactOwner(
  canvas: HTMLCanvasElement,
  commands: EditorCommands,
  pending: (active: boolean) => void,
) {
  let current: PenContact | undefined;
  const note = (value: PenContact, reason: string, outcome: string) =>
    inputDiagnostic(
      value.token,
      value.source,
      reason,
      outcome,
      value.next,
      value.max,
      commands.read(),
    );
  const release = () => {
    const previous = current;
    current = undefined;
    pending(false);
    if (previous && canvas.hasPointerCapture(previous.pointer))
      canvas.releasePointerCapture(previous.pointer);
  };
  const coherent = () => {
    const state = commands.read();
    return (
      current &&
      (["owner", "session", "mapping", "interaction"] as const).every(
        (key) => state[key] === current?.token[key],
      )
    );
  };
  return {
    get current() {
      return current;
    },
    set(value: PenContact) {
      current = value;
    },
    note,
    release,
    matches(event: PointerEvent) {
      return (
        current &&
        event.pointerId === current.pointer &&
        event.timeStamp >= (current.pending ? current.releaseTime : current.time)
      );
    },
    freeze(time: number) {
      if (!current || current.pending || !coherent()) return;
      current.pending = true;
      current.releaseTime = time;
      pending(true);
      note(current, "release-pending", "ok");
    },
    cancel(cause: Parameters<typeof penBridge.cancel>[1], reason: string = cause) {
      const previous = current;
      release();
      if (previous) {
        const result = commands.run(() => penBridge.cancel(previous.token, cause));
        note(previous, reason, result?.code ?? "host-unavailable");
      }
    },
    sync() {
      if (current && !coherent()) {
        note(current, "shared-cancel", commands.read().code);
        release();
      }
    },
  };
}
