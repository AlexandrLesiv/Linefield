import { button, element } from "../dom.ts";
import { drawingTool } from "../drawing-controls.css.ts";
import { t } from "../locale.ts";
import { bridge } from "./bridge.ts";
import type { MappingValue } from "./bridge.ts";
import { viewportBridge } from "./viewport-bridge.ts";
import type { EditorCommands } from "./pen-input.ts";
import { interactionLock } from "./view.css.ts";
import { rotationGroup, paperControl, rotationButton } from "./viewport.css.ts";
export function createRotationControls(root: HTMLElement) {
  const zoom = root.querySelector<HTMLElement>(".canvas-zoom");
  if (!zoom) return;
  const group = element("span", rotationGroup);
  for (const direction of ["left", "reset", "right"] as const) {
    const control = button(
      direction === "reset" ? "0°" : direction === "left" ? "−15°" : "+15°",
      `${drawingTool} ${paperControl} ${rotationButton}`,
      () => {},
    );
    control.dataset.memoryRotation = direction;
    control.disabled = true;
    group.append(control);
  }
  zoom.before(group);
}
export function attachRotationControls(surface: HTMLElement, commands: EditorCommands) {
  const controls = [...surface.querySelectorAll<HTMLButtonElement>("[data-memory-rotation]")];
  const formatter = new Intl.NumberFormat(navigator.language);
  let lastAngle: number | undefined;
  let cached: MappingValue | undefined;
  const click = (event: Event) => {
    const control = event.currentTarget;
    if (!(control instanceof HTMLButtonElement)) return;
    const direction = control.dataset.memoryRotation;
    if (direction === "left" || direction === "right" || direction === "reset")
      commands.run((state) => viewportBridge.rotate(state, direction));
  };
  for (const control of controls) control.addEventListener("click", click);
  return {
    refresh() {
      try {
        const state = commands.read();
        if (
          !cached ||
          cached.owner !== state.owner ||
          cached.session !== state.session ||
          cached.mapping !== state.mapping
        )
          cached = bridge.mapping(state.owner, state.session);
        const mapping = cached;
        const changed = lastAngle !== mapping.rotationDegrees;
        const angle = changed ? formatter.format(mapping.rotationDegrees) : "";
        lastAngle = mapping.rotationDegrees;
        for (const control of controls) {
          const direction = control.dataset.memoryRotation;
          if (changed && direction === "reset") control.textContent = `${angle}°`;
          if (changed)
            control.setAttribute(
              "aria-label",
              direction === "reset"
                ? t("memory.rotationReset", { angle })
                : t(direction === "left" ? "memory.rotateLeft" : "memory.rotateRight"),
            );
          control.disabled = !mapping.available || state.interaction !== 0n;
          control.classList.toggle(interactionLock, mapping.available && state.interaction !== 0n);
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
