import type { ReplyValue } from "./bridge.ts";
import type { EditorCommands } from "./pen-input.ts";
import { penBridge } from "./pen-bridge.ts";
import { viewportBridge } from "./viewport-bridge.ts";
import { localPoint } from "./pen-samples.ts";
import { dragging } from "./viewport.css.ts";
export function viewportContact(canvas: HTMLCanvasElement, commands: EditorCommands) {
  let contact:
    | {
        token: ReplyValue;
        pointer: number;
        time: number;
        next: bigint;
        point: readonly [number, number];
      }
    | undefined;
  let held: number | undefined;
  let heldTime = 0;
  function release() {
    const old = contact;
    contact = undefined;
    canvas.classList.remove(dragging);
    if (old && canvas.hasPointerCapture(old.pointer)) canvas.releasePointerCapture(old.pointer);
    return old;
  }
  const cancel = (cause: "escape" | "blur" | "capture-loss" | "pointer-cancel") => {
    const old = release();
    if (old) commands.run(() => penBridge.cancel(old.token, cause));
  };
  const matches = (event: PointerEvent) =>
    contact?.pointer === event.pointerId && event.timeStamp >= contact.time;
  function update(event: PointerEvent) {
    const old = contact;
    if (!old || !matches(event)) return;
    const point = localPoint(canvas, event);
    if (point[0] === old.point[0] && point[1] === old.point[1]) return;
    const result = commands.run(() =>
      viewportBridge.update(old.token, old.next, point[0], point[1]),
    );
    if (result?.code !== "ok") {
      release();
      return;
    }
    old.point = point;
    old.next++;
  }
  function end(event?: PointerEvent) {
    if (event) update(event);
    const old = release();
    if (old) commands.run(() => viewportBridge.end(old.token, old.next));
  }
  return {
    cancel,
    end,
    down(event: PointerEvent, armed: boolean) {
      if (!event.isPrimary || event.pointerType !== "mouse" || event.button !== 0) return;
      if (held !== undefined) {
        if (event.timeStamp < heldTime) {
          event.stopImmediatePropagation();
          return;
        }
        cancel("capture-loss");
        held = undefined;
      }
      if (!armed || !event.isPrimary || event.pointerType !== "mouse" || event.button !== 0) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      held = event.pointerId;
      heldTime = event.timeStamp;
      const point = localPoint(canvas, event);
      const result = commands.run((state) =>
        viewportBridge.begin(state, event.pointerId, point[0], point[1]),
      );
      if (result?.code !== "ok") return;
      contact = { token: result, pointer: event.pointerId, time: event.timeStamp, next: 1n, point };
      canvas.classList.add(dragging);
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        cancel("capture-loss");
      }
    },
    move(event: PointerEvent) {
      if (held !== event.pointerId) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      update(event);
    },
    up(event: PointerEvent) {
      if (held !== event.pointerId) return;
      if (contact && !matches(event)) return;
      held = undefined;
      event.stopImmediatePropagation();
      event.preventDefault();
      end(event);
    },
    interrupt(event: PointerEvent) {
      if (!matches(event)) return;
      held = undefined;
      event.stopImmediatePropagation();
      cancel(event.type === "pointercancel" ? "pointer-cancel" : "capture-loss");
    },
    sync() {
      if (contact && commands.read().interaction !== contact.token.interaction) {
        release();
        return true;
      }
      return false;
    },
    reset() {
      cancel("blur");
      held = undefined;
    },
    active: () => contact !== undefined,
  };
}
