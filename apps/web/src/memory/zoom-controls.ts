import { button, element } from "../dom.ts";
import { drawingTool } from "../drawing-controls.css.ts";
import { t } from "../locale.ts";
import { bridge } from "./bridge.ts";
import { viewportBridge } from "./viewport-bridge.ts";
import type { EditorCommands } from "./pen-input.ts";
import { interactionLock } from "./view.css.ts";
import { zoomGroup, zoomValue, paperControl, zoomButton } from "./viewport.css.ts";
export function createZoomControls(root: HTMLElement) {
  const group = root.querySelector<HTMLElement>(".canvas-zoom");
  if (!group) return;
  group.classList.add(zoomGroup);
  const controls = (["out", "in"] as const).map((direction) => {
    const control = button(
      direction === "in" ? "+" : "−",
      `${drawingTool} ${paperControl} ${zoomButton}`,
      () => {},
    );
    control.setAttribute("aria-label", t(direction === "in" ? "memory.zoomIn" : "memory.zoomOut"));
    control.dataset.memoryZoom = direction;
    control.disabled = true;
    return control;
  });
  const value = element("span", zoomValue, "");
  value.dataset.memoryZoomValue = "";
  group.replaceChildren(controls[0]!, value, controls[1]!);
}
export function attachZoomControls(surface: HTMLElement, commands: EditorCommands) {
  const controls = [...surface.querySelectorAll<HTMLButtonElement>("[data-memory-zoom]")];
  const value = surface.querySelector<HTMLElement>("[data-memory-zoom-value]");
  const idle = new Map<HTMLButtonElement, boolean>();
  const click = (event: Event) => {
    const control = event.currentTarget;
    if (!(control instanceof HTMLButtonElement)) return;
    commands.run((state) =>
      viewportBridge.zoom(state, control.dataset.memoryZoom === "in" ? "in" : "out"),
    );
  };
  for (const control of controls) control.addEventListener("click", click);
  return {
    refresh() {
      try {
        const state = commands.read();
        const mapping = bridge.mapping(state.owner, state.session);
        const text = new Intl.NumberFormat(navigator.language, {
          style: "percent",
          maximumFractionDigits: 0,
        }).format(mapping.zoom);
        if (value) {
          value.textContent = text;
          value.setAttribute("aria-label", t("memory.zoomValue", { percent: text }));
        }
        for (const control of controls) {
          const endpoint =
            control.dataset.memoryZoom === "in" ? mapping.zoom >= 8 : mapping.zoom <= 0.1;
          const available = mapping.available && !endpoint;
          if (state.interaction === 0n) idle.set(control, available);
          control.disabled = !available || state.interaction !== 0n;
          control.classList.toggle(
            interactionLock,
            state.interaction !== 0n && !!idle.get(control),
          );
        }
      } catch {
        commands.fail();
      }
    },
    dispose() {
      for (const control of controls) control.removeEventListener("click", click);
    },
  };
}
