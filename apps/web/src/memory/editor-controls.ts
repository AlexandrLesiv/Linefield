import { widthControl } from "./width-control.ts";
import type { StateValue } from "./bridge.ts";
import { bridge } from "./bridge.ts";
import { penBridge } from "./pen-bridge.ts";
import type { EditorCommands } from "./pen-input.ts";
import { interactionLock } from "./view.css.ts";
export function attachEditorControls(surface: HTMLElement, commands: EditorCommands) {
  const width = surface.querySelector<HTMLInputElement>("[data-memory-width]");
  const color = surface.querySelector<HTMLInputElement>("[data-memory-color]");
  const undo = surface.querySelector<HTMLButtonElement>("[data-memory-undo]");
  const redo = surface.querySelector<HTMLButtonElement>("[data-memory-redo]");
  const pen = surface.querySelector<HTMLButtonElement>("[data-memory-pen]");
  let acceptedWidth = 8;
  let idleUndo = false;
  let idleRedo = false;
  const widthView = width ? widthControl(width, surface, () => acceptedWidth) : undefined;
  const refresh = () => {
    let state: StateValue;
    try {
      state = bridge.read(commands.read().owner);
    } catch {
      commands.fail();
      return;
    }
    acceptedWidth = state.width;
    const idle = state.interaction === 0n;
    const available = state.phase === "ready";
    if (idle) {
      idleUndo = available && state.canUndo;
      idleRedo = available && state.canRedo;
    }
    const locked = !idle && available;
    for (const control of [pen, width, color]) control?.classList.toggle(interactionLock, locked);
    undo?.classList.toggle(interactionLock, locked && idleUndo);
    redo?.classList.toggle(interactionLock, locked && idleRedo);
    if (width) {
      width.disabled = !idle || !available;
      width.value = String(state.width);
      widthView?.present();
    }
    const value = surface.querySelector(".property-width .property-value");
    if (value) value.textContent = new Intl.NumberFormat(navigator.language).format(state.width);
    if (color) {
      color.disabled = !idle || !available;
      color.value = `#${[state.red, state.green, state.blue]
        .map((v) =>
          Math.round(v * 255)
            .toString(16)
            .padStart(2, "0"),
        )
        .join("")}`;
    }
    if (undo) undo.disabled = !available || !state.canUndo;
    if (redo) redo.disabled = !available || !state.canRedo;
    if (pen) pen.disabled = !idle || !available;
  };
  const settings = (event: Event) => {
    if (!width || !color) return;
    const value = color.value;
    if (event.currentTarget === width && !widthView?.accepted()) return;
    commands.run((state) =>
      penBridge.settings(
        state,
        width.valueAsNumber,
        parseInt(value.slice(1, 3), 16) / 255,
        parseInt(value.slice(3, 5), 16) / 255,
        parseInt(value.slice(5, 7), 16) / 255,
      ),
    );
  };
  const undoClick = () => commands.run(penBridge.undo);
  const redoClick = () => commands.run(penBridge.redo);
  width?.addEventListener("change", settings);
  color?.addEventListener("change", settings);
  undo?.addEventListener("click", undoClick);
  redo?.addEventListener("click", redoClick);
  const key = (event: KeyboardEvent) => {
    const target = event.target;
    if (
      event.isComposing ||
      !(target instanceof HTMLElement) ||
      target.matches("canvas,input,textarea,select") ||
      target.isContentEditable
    )
      return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
      commands.run(event.shiftKey ? penBridge.redo : penBridge.undo);
      event.preventDefault();
    }
  };
  surface.addEventListener("keydown", key);
  refresh();
  return {
    refresh,
    dispose() {
      widthView?.dispose();
      surface.removeEventListener("keydown", key);
      width?.removeEventListener("change", settings);
      color?.removeEventListener("change", settings);
      undo?.removeEventListener("click", undoClick);
      redo?.removeEventListener("click", redoClick);
    },
  };
}
