import type { EditorCommands } from "./pen-input.ts";
import { viewportContact } from "./viewport-contact.ts";
import { viewportBridge } from "./viewport-bridge.ts";
import type { PanDirection } from "./viewport-bridge.ts";
import { armed } from "./viewport.css.ts";
const arrows: Readonly<Record<string, PanDirection>> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};
export function attachViewportInput(
  canvas: HTMLCanvasElement,
  commands: EditorCommands,
  pending: (active: boolean) => void,
) {
  const contact = viewportContact(canvas, commands, pending);
  let space = false;
  const blocked = new Set<string>();
  const controller = new AbortController();
  const options = { signal: controller.signal, capture: true };
  const disarm = () => {
    space = false;
    canvas.classList.remove(armed);
  };
  const reset = () => {
    disarm();
    blocked.clear();
    contact.reset();
  };
  const keydown = (event: KeyboardEvent) => {
    if (
      event.target !== canvas ||
      event.isComposing ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey
    )
      return;
    if (
      event.key === "Escape" &&
      (contact.active() || (space && commands.read().interaction === 0n))
    ) {
      contact.cancel("escape");
      disarm();
      blocked.add(" ");
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    const direction = arrows[event.key];
    if (event.key !== " " && !direction) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (blocked.has(event.key)) return;
    if (commands.read().interaction !== 0n && !contact.active()) {
      blocked.add(event.key);
      return;
    }
    if (event.key === " ") {
      space = true;
      canvas.classList.add(armed);
      return;
    }
    const result = commands.run((state) => viewportBridge.step(state, direction!));
    if (result?.code !== "ok" && result?.code !== "noop") blocked.add(event.key);
  };
  const keyup = (event: KeyboardEvent) => {
    blocked.delete(event.key);
    if (event.key === " ") {
      disarm();
      contact.end();
    }
  };
  canvas.addEventListener("keydown", keydown, options);
  window.addEventListener("keyup", keyup, options);
  canvas.addEventListener("pointerdown", (event) => contact.down(event, space), options);
  window.addEventListener("pointermove", contact.move, options);
  window.addEventListener("pointerup", contact.up, options);
  for (const name of ["pointercancel", "lostpointercapture", "gotpointercapture"] as const)
    window.addEventListener(name, contact.interrupt, options);
  canvas.addEventListener("blur", reset, options);
  window.addEventListener("blur", reset, options);
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) reset();
    },
    options,
  );
  return {
    sync() {
      if (contact.sync() || commands.read().activeCancelled) {
        if (space) blocked.add(" ");
        disarm();
      }
    },
    dispose() {
      reset();
      controller.abort();
    },
  };
}
