import { penBridge } from "./pen-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
export interface EditorCommands {
  read(): ReplyValue;
  fail(): void;
  run(action: (state: ReplyValue) => ReplyValue): ReplyValue | undefined;
}
export function attachPenInput(canvas: HTMLCanvasElement, commands: EditorCommands) {
  let contact: { pointer: number; token: ReplyValue; time: number; next: bigint } | undefined;
  const local = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return [
      ((event.clientX - rect.left) * canvas.clientWidth) / rect.width,
      ((event.clientY - rect.top) * canvas.clientHeight) / rect.height,
    ] as const;
  };
  const release = () => {
    const previous = contact;
    contact = undefined;
    if (previous && canvas.hasPointerCapture(previous.pointer))
      canvas.releasePointerCapture(previous.pointer);
  };
  function cancel(cause: "escape" | "blur" | "pointer-cancel" | "capture-loss" | "queue-overflow") {
    const previous = contact;
    release();
    if (previous) commands.run(() => penBridge.cancel(previous.token, cause));
  }
  const matches = (event: PointerEvent) =>
    contact && event.pointerId === contact.pointer && event.timeStamp >= contact.time;
  const down = (event: PointerEvent) => {
    if (
      contact ||
      !event.isPrimary ||
      event.button !== 0 ||
      !["mouse", "pen"].includes(event.pointerType)
    )
      return;
    const [x, y] = local(event);
    const result = commands.run((state) =>
      penBridge.begin(
        state,
        event.pointerId,
        x,
        y,
        event.pointerType === "pen" ? event.pressure : 0,
        event.pointerType === "pen",
      ),
    );
    if (!result || result.code !== "ok") return;
    contact = { pointer: event.pointerId, token: result, time: event.timeStamp, next: 1n };
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      cancel("capture-loss");
    }
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (!matches(event) || !contact) return;
    const coalesced = event.getCoalescedEvents?.() ?? [];
    const events = coalesced.length ? coalesced : [event];
    if (events.length > 1024) {
      cancel("queue-overflow");
      return;
    }
    for (let offset = 0; offset < events.length; offset += 256) {
      if (!contact) break;
      const count = Math.min(256, events.length - offset);
      const batch = {
        x: new Float64Array(count),
        y: new Float64Array(count),
        pressure: new Float64Array(count),
        hasPressure: new Uint8Array(count),
      };
      for (let i = 0; i < count; i++) {
        const sample = events[offset + i]!;
        const [x, y] = local(sample);
        batch.x[i] = x;
        batch.y[i] = y;
        if (sample.pointerType === "pen") {
          batch.pressure[i] = sample.pressure;
          batch.hasPressure[i] = 1;
        }
      }
      const current = contact;
      const result = commands.run(() => penBridge.append(current.token, current.next, batch));
      if (!result || result.code !== "ok") {
        release();
        return;
      }
      contact.token = result;
      contact.next += BigInt(count);
    }
    event.preventDefault();
  };
  const up = (event: PointerEvent) => {
    if (!matches(event) || !contact) return;
    const previous = contact;
    release();
    commands.run(() => penBridge.end(previous.token, previous.next));
    event.preventDefault();
  };
  const pointerCancel = (event: PointerEvent) => {
    if (matches(event)) cancel("pointer-cancel");
  };
  const captureLost = (event: PointerEvent) => {
    if (matches(event)) cancel("capture-loss");
  };
  const blur = () => cancel("blur");
  const visibility = () => {
    if (document.hidden) blur();
  };
  const key = (event: KeyboardEvent) => {
    if (event.isComposing || event.target !== canvas) return;
    if (event.key === "Escape") {
      cancel("escape");
      event.preventDefault();
    }
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      commands.run(event.shiftKey ? penBridge.redo : penBridge.undo);
      event.preventDefault();
    }
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", pointerCancel);
  canvas.addEventListener("lostpointercapture", captureLost);
  canvas.addEventListener("keydown", key);
  canvas.addEventListener("blur", blur);
  window.addEventListener("blur", blur);
  document.addEventListener("visibilitychange", visibility);
  return {
    sync() {
      if (contact && commands.read().interaction !== contact.token.interaction) release();
    },
    dispose() {
      release();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("lostpointercapture", captureLost);
      canvas.removeEventListener("keydown", key);
      canvas.removeEventListener("blur", blur);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
