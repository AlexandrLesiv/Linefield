import type { ActionPoint } from "./drawing-actions.ts";
/** Native desktop preview only: browser Web keeps its own context menu. */
export function attachActions(
  card: HTMLElement,
  open: HTMLElement,
  action: (point?: ActionPoint) => void,
): void {
  card.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    action(event.button === 2 ? { x: event.clientX, y: event.clientY } : undefined);
  });
  open.addEventListener("keydown", (event) => {
    if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      action();
    }
  });
}
