import { inputKeyboard } from "./input-keyboard.ts";
import { inputBatch } from "./input-batch.ts";
import { edit } from "./edit-bridge.ts";
import { contactState, localPoint } from "./input-state.ts";
import type { Commands } from "./input-state.ts";
export function attachInput(canvas: HTMLCanvasElement, commands: Commands) {
  const owner = contactState(canvas, commands),
    controller = new AbortController(),
    options = { signal: controller.signal };
  const keys = inputKeyboard(commands, () => owner.cancel("escape"));
  function down(e: PointerEvent) {
    if (!e.isPrimary || e.button !== 0 || !["mouse", "pen"].includes(e.pointerType)) return;
    if (owner.current?.pending) owner.cancel("capture-loss");
    if (owner.current) return;
    const [x, y] = localPoint(canvas, e),
      tool = canvas.dataset.tool ?? "ink",
      mode = keys.held.space
        ? "pan"
        : keys.held.rotate
          ? "rotate"
          : tool === "pan"
            ? "pan"
            : tool === "rotate"
              ? "rotate"
              : "ink";
    const result = commands.run((s) =>
      mode === "ink"
        ? edit.begin(
            s,
            e.pointerId,
            x,
            y,
            e.pointerType === "pen" ? e.pressure : 0,
            e.pointerType === "pen",
          )
        : edit.panBegin(s, e.pointerId, x, y, mode === "rotate"),
    );
    if (result?.code !== "ok") return;
    owner.set({
      pointer: e.pointerId,
      source: e.pointerType,
      mode,
      token: result,
      time: e.timeStamp,
      next: 1n,
      sequence: 0n,
      pending: false,
      releaseTime: 0,
      x: e.clientX,
      y: e.clientY,
      pressure: e.pointerType === "pen" ? e.pressure : 0,
    });
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      owner.cancel("capture-loss");
    }
    e.preventDefault();
  }
  const append = inputBatch(canvas, commands, owner);
  function move(e: PointerEvent) {
    const contact = owner.current;
    if (!contact || !owner.matches(e)) return;
    if (contact.pending) {
      if (e.buttons !== 0) owner.cancel("capture-loss");
      return;
    }
    if (contact.mode === "ink") {
      const coalesced = e.getCoalescedEvents?.() ?? [];
      append(coalesced.length ? coalesced : [e]);
    } else {
      const [x, y] = localPoint(canvas, e);
      contact.sequence += 1n;
      commands.run(() => edit.panUpdate(contact.token, contact.sequence, x, y, e.shiftKey));
    }
    e.preventDefault();
  }
  function up(e: PointerEvent) {
    const contact = owner.current;
    if (!contact || !owner.matches(e)) return;
    if (
      contact.pending &&
      !(
        e.isTrusted &&
        e.isPrimary &&
        e.pointerType === contact.source &&
        e.button === 0 &&
        e.buttons === 0
      )
    )
      return;
    if (contact.mode === "ink") {
      if (e.clientX !== contact.x || e.clientY !== contact.y) append([e], true);
      const terminal = owner.current;
      owner.release();
      if (terminal) commands.run(() => edit.end(terminal.token, terminal.next));
    } else {
      move(e);
      owner.release();
      commands.run(() => edit.panEnd(contact.token, contact.sequence));
    }
    e.preventDefault();
  }
  function lost(e: PointerEvent) {
    const contact = owner.current;
    if (!contact || !owner.matches(e)) return;
    if (
      e.isTrusted &&
      e.isPrimary &&
      e.pointerType === contact.source &&
      e.target === canvas &&
      e.buttons === 0 &&
      e.button === -1
    ) {
      contact.pending = true;
      contact.releaseTime = e.timeStamp;
    } else owner.cancel("capture-loss");
  }
  canvas.addEventListener("pointerdown", down, options);
  canvas.addEventListener("pointermove", move, options);
  canvas.addEventListener("pointerup", up, options);
  canvas.addEventListener("lostpointercapture", lost, options);
  canvas.addEventListener(
    "pointercancel",
    (e) => {
      if (owner.matches(e)) owner.cancel("pointer-cancel");
    },
    options,
  );
  canvas.addEventListener("blur", () => owner.cancel(), options);
  window.addEventListener("keydown", keys.down, options);
  window.addEventListener("keyup", keys.up, options);
  window.addEventListener(
    "blur",
    () => {
      keys.reset();
      owner.cancel();
    },
    options,
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) {
        keys.reset();
        owner.cancel();
      }
    },
    options,
  );
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (owner.current) return;
      const r = canvas.getBoundingClientRect(),
        v = commands.view(),
        zoom = Math.max(0.05, Math.min(16, v.zoom * Math.exp(-e.deltaY * 0.001)));
      commands.run((s) => edit.view(s, zoom, e.clientX - r.left, e.clientY - r.top, false));
    },
    { ...options, passive: false },
  );
  for (const type of ["pointerup", "pointermove", "pointercancel", "gotpointercapture"] as const)
    document.addEventListener(
      type,
      (e) => {
        if (!owner.current?.pending) return;
        if (type === "gotpointercapture" && owner.matches(e)) {
          owner.cancel("capture-loss");
          return;
        }
        if (e.target === canvas) return;
        if (type === "pointerup") up(e);
        else if (type === "pointermove") move(e);
        else if (owner.matches(e)) owner.cancel("capture-loss");
      },
      { ...options, capture: true },
    );
  return {
    sync: owner.sync,
    cancel: owner.cancel,
    dispose() {
      owner.cancel();
      controller.abort();
    },
  };
}
