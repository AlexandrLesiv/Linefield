import type { ReplyValue } from "./bridge.ts";
import type { EditorCommands } from "./pen-input.ts";
import { penBridge } from "./pen-bridge.ts";
import { viewportBridge } from "./viewport-bridge.ts";
import { localPoint } from "./pen-samples.ts";
import { dragging } from "./viewport.css.ts";
import { pendingReleaseLoss, pendingReleaseEnd } from "./pointer-release.ts";
import { inputDiagnostic } from "./input-diagnostics.ts";
export function viewportContact(
  canvas: HTMLCanvasElement,
  commands: EditorCommands,
  pending: (active: boolean) => void,
) {
  let contact:
    | {
        token: ReplyValue;
        pointer: number;
        source: string;
        time: number;
        next: bigint;
        point: readonly [number, number];
        releaseTime: number | undefined;
      }
    | undefined;
  let held: { pointer: number; source: string; time: number } | undefined;
  const note = (value: NonNullable<typeof contact>, reason: string, outcome: string) =>
    inputDiagnostic(value.token, value.source, reason, outcome, 0n, 0, commands.read());
  function release() {
    const old = contact;
    contact = undefined;
    if (old?.releaseTime !== undefined) pending(false);
    canvas.classList.remove(dragging);
    if (old && canvas.hasPointerCapture(old.pointer)) canvas.releasePointerCapture(old.pointer);
    return old;
  }
  const cancel = (cause: "escape" | "blur" | "capture-loss" | "pointer-cancel") => {
    const old = release();
    if (old) {
      const result = commands.run(() => penBridge.cancel(old.token, cause));
      note(old, "pan-cancel", result?.code ?? "host-unavailable");
    }
  };
  const matches = (event: PointerEvent) =>
    contact?.pointer === event.pointerId &&
    contact.source === event.pointerType &&
    event.isPrimary &&
    event.timeStamp >= (contact.releaseTime ?? contact.time);
  const matchesHeld = (event: PointerEvent) =>
    held?.pointer === event.pointerId &&
    held.source === event.pointerType &&
    event.isPrimary &&
    event.timeStamp >= held.time;
  function update(event: PointerEvent) {
    const old = contact;
    if (!old || !matches(event) || old.releaseTime !== undefined) return;
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
    if (old) {
      const result = commands.run(() => viewportBridge.end(old.token, old.next));
      note(old, "pan-end", result?.code ?? "host-unavailable");
    }
  }
  return {
    cancel,
    end,
    down(event: PointerEvent, armed: boolean) {
      if (!event.isPrimary || !["mouse", "pen"].includes(event.pointerType) || event.button !== 0)
        return;
      if (held !== undefined) {
        if (
          (contact && contact.releaseTime === undefined) ||
          event.timeStamp < (contact?.releaseTime ?? held.time)
        ) {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        cancel("capture-loss");
        held = undefined;
      }
      if (!armed) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      held = { pointer: event.pointerId, source: event.pointerType, time: event.timeStamp };
      const point = localPoint(canvas, event);
      const result = commands.run((state) =>
        viewportBridge.begin(state, event.pointerId, point[0], point[1]),
      );
      if (result?.code !== "ok") return;
      contact = {
        token: result,
        pointer: event.pointerId,
        source: event.pointerType,
        time: event.timeStamp,
        next: 1n,
        point,
        releaseTime: undefined,
      };
      canvas.classList.add(dragging);
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        cancel("capture-loss");
      }
    },
    move(event: PointerEvent) {
      if (!matchesHeld(event)) return;
      event.stopImmediatePropagation();
      event.preventDefault();
      if (contact?.releaseTime !== undefined) {
        if (matches(event) && event.buttons !== 0) cancel("capture-loss");
        return;
      }
      update(event);
    },
    up(event: PointerEvent) {
      if (!matchesHeld(event)) return;
      if (contact && !matches(event)) return;
      if (
        contact?.releaseTime !== undefined &&
        !pendingReleaseEnd(event, contact.source, contact.releaseTime)
      )
        return;
      held = undefined;
      event.stopImmediatePropagation();
      event.preventDefault();
      end(event);
    },
    interrupt(event: PointerEvent) {
      if (!matches(event)) return;
      if (event.type === "gotpointercapture" && contact?.releaseTime === undefined) return;
      event.stopImmediatePropagation();
      if (
        event.type === "lostpointercapture" &&
        contact &&
        pendingReleaseLoss(event, canvas, contact.source)
      ) {
        if (contact.releaseTime === undefined) {
          contact.releaseTime = event.timeStamp;
          pending(true);
          note(contact, "pan-release-pending", "ok");
        }
        return;
      }
      held = undefined;
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
