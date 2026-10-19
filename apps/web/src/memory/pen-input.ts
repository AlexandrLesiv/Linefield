import { penBridge } from "./pen-bridge.ts";
import { inputDiagnostic } from "./input-diagnostics.ts";
import type { ReplyValue } from "./bridge.ts";
import { contactOwner } from "./pen-contact.ts";
import { localPoint, sampleBatch } from "./pen-samples.ts";
import { pendingReleaseLoss, pendingReleaseEnd } from "./pointer-release.ts";
export interface EditorCommands {
  read(): ReplyValue;
  fail(): void;
  run(action: (state: ReplyValue) => ReplyValue): ReplyValue | undefined;
}
export function attachPenInput(
  canvas: HTMLCanvasElement,
  commands: EditorCommands,
  pending: (active: boolean) => void,
) {
  const owner = contactOwner(canvas, commands, pending);
  const { note, release, cancel, matches } = owner;
  const down = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || !["mouse", "pen"].includes(event.pointerType))
      return;
    if (owner.current?.pending) {
      if (event.timeStamp < owner.current.releaseTime) return;
      cancel("capture-loss", "fresh-contact");
    }
    if (owner.current) return;
    const [x, y] = localPoint(canvas, event);
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
    if (!result || result.code !== "ok") {
      inputDiagnostic(
        commands.read(),
        event.pointerType,
        "begin",
        result?.code ?? "host-unavailable",
        0n,
        0,
      );
      return;
    }
    owner.set({
      pointer: event.pointerId,
      token: result,
      time: event.timeStamp,
      next: 1n,
      source: event.pointerType,
      max: 0,
      pending: false,
      releaseTime: 0,
    });
    note(owner.current!, "begin", result.code);
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      cancel("capture-loss");
    }
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    const contact = owner.current;
    if (!matches(event) || !contact) return;
    if (contact.pending) {
      if (event.buttons !== 0) cancel("capture-loss", "pressed-move");
      return;
    }
    const coalesced = event.getCoalescedEvents?.() ?? [];
    const events = coalesced.length ? coalesced : [event];
    contact.max = Math.max(contact.max, events.length);
    if (events.length > 1024) {
      cancel("queue-overflow");
      return;
    }
    for (let offset = 0; offset < events.length; offset += 256) {
      const current = owner.current;
      if (!current) break;
      const batch = sampleBatch(canvas, events, offset);
      const result = commands.run(() => penBridge.append(current.token, current.next, batch));
      if (!result || result.code !== "ok") {
        note(current, "append", result?.code ?? "host-unavailable");
        release();
        return;
      }
      current.token = result;
      current.next += BigInt(batch.x.length);
    }
    event.preventDefault();
  };
  const up = (event: PointerEvent) => {
    const previous = owner.current;
    if (!matches(event) || !previous) return;
    if (previous.pending && !pendingReleaseEnd(event, previous.source, previous.releaseTime))
      return;
    release();
    const result = commands.run(() => penBridge.end(previous.token, previous.next));
    note(previous, "end", result?.code ?? "host-unavailable");
    event.preventDefault();
  };
  const pointerCancel = (event: PointerEvent) => {
    if (matches(event)) cancel("pointer-cancel");
  };
  const captureLost = (event: PointerEvent) => {
    if (!matches(event)) return;
    if (owner.current && pendingReleaseLoss(event, canvas, owner.current.source)) {
      owner.freeze(event.timeStamp);
    } else cancel("capture-loss");
  };
  const blur = () => cancel("blur", "canvas-blur");
  const windowBlur = () => cancel("blur", "window-blur");
  const visibility = () => {
    if (document.hidden) cancel("blur", "hidden");
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
  const controller = new AbortController();
  const options = { signal: controller.signal };
  canvas.addEventListener("pointerdown", down, options);
  canvas.addEventListener("pointermove", move, options);
  canvas.addEventListener("pointerup", up, options);
  canvas.addEventListener("pointercancel", pointerCancel, options);
  canvas.addEventListener("lostpointercapture", captureLost, options);
  canvas.addEventListener("keydown", key, options);
  canvas.addEventListener("blur", blur, options);
  window.addEventListener("blur", windowBlur, options);
  document.addEventListener("visibilitychange", visibility, options);
  const pendingEvent = (event: PointerEvent) => {
    if (!owner.current?.pending) return;
    if (event.type === "gotpointercapture" && matches(event)) {
      cancel("capture-loss");
      return;
    }
    if (event.target === canvas) return;
    if (event.type === "pointerup") up(event);
    else if (event.type === "pointermove") move(event);
    else if (matches(event)) cancel("capture-loss");
  };
  for (const type of ["pointerup", "pointermove", "pointercancel", "gotpointercapture"] as const)
    document.addEventListener(type, pendingEvent, { ...options, capture: true });
  return {
    sync: owner.sync,
    dispose() {
      release();
      controller.abort();
    },
  };
}
