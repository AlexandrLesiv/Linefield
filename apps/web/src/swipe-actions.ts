import "./swipe-actions.css.ts";
import { button, element } from "./dom.ts";
import { t } from "./locale.ts";
import { attachSwipeDrag } from "./swipe-drag.ts";
import type { DrawingAction } from "./drawing-actions.ts";
let active: { card: HTMLElement; close: () => void } | null = null;
const outside = (event: PointerEvent) => {
  if (event.target instanceof Node && !active?.card.contains(event.target)) active?.close();
};
document.addEventListener("pointerdown", outside);
import.meta.hot?.dispose(() => document.removeEventListener("pointerdown", outside));

/** Single-column phone preview: reveal explicit actions, never delete on a full swipe. */
export function attachSwipeActions(
  card: HTMLElement,
  open: HTMLElement,
  name: string,
  run: (kind: DrawingAction, origin: HTMLElement) => void,
): () => void {
  const controller = new AbortController();
  const options = { signal: controller.signal };
  card.classList.add("swipe-card");
  const rail = element("div", "swipe-actions");
  rail.setAttribute("role", "group");
  rail.setAttribute("aria-label", open.getAttribute("aria-label") ?? "");
  const position = (value: number, dragging = false) => {
    open.style.transition = dragging ? "none" : "";
    rail.style.transition = dragging ? "none" : "";
    open.style.transform = `translateX(${value}px)`;
    rail.style.opacity = `${Math.min(1, Math.abs(value) / 32)}`;
    if (value < 0) card.setAttribute("data-swiped", "true");
    else card.removeAttribute("data-swiped");
    rail.inert = dragging || value === 0;
  };
  const close = () => {
    position(0);
    if (active?.card === card) active = null;
  };
  const reveal = () => {
    if (active?.card !== card) active?.close();
    active = { card, close };
    position(-160);
  };
  for (const kind of ["rename", "delete"] as const) {
    const action = button(t(kind === "rename" ? "action.rename" : "action.delete"), kind, () => {
      if (kind === "rename") close();
      run(kind, action);
      if (kind !== "rename") close();
    });
    rail.append(action);
  }
  rail.inert = true;
  card.prepend(rail);
  const access = button(t("drawing.actions", { name }), "swipe-access", () => {
    reveal();
    rail.querySelector<HTMLElement>("button")?.focus();
  });
  card.append(access);
  card.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape" && active?.card === card) {
        close();
        open.focus({ preventScroll: true });
        event.preventDefault();
      }
      if (
        event.target === open &&
        (event.key === "ArrowLeft" ||
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10"))
      ) {
        reveal();
        rail.querySelector<HTMLElement>("button")?.focus();
        event.preventDefault();
      }
    },
    options,
  );
  open.addEventListener("contextmenu", (event) => event.preventDefault(), options);
  attachSwipeDrag(
    open,
    () => {
      const transform = getComputedStyle(open).transform;
      const current = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
      position(current, true);
      return current;
    },
    (value) => {
      if (active?.card !== card) active?.close();
      active = { card, close };
      position(value, true);
    },
    (shown) => (shown ? reveal() : close()),
    controller.signal,
  );
  open.addEventListener(
    "click",
    (event) => {
      if (active?.card === card) {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      }
    },
    { ...options, capture: true },
  );
  return () => {
    controller.abort();
    if (active?.card === card) active = null;
    rail.remove();
    access.remove();
    card.classList.remove("swipe-card");
    card.removeAttribute("data-swiped");
    open.style.transform = "";
    open.style.transition = "";
  };
}
