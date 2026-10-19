import { galleryMenu, galleryMenuContent, destructive, menuButton } from "./menu.css.ts";
import { acquireBackdrop } from "./action-backdrop.ts";
import { morphDeleteMenu } from "./delete-menu-motion.ts";
import { closeMotion, openMotion, placeMenu } from "./menu-motion.ts";

type MenuItem = {
  label: string;
  destructive?: boolean;
  handoff?: boolean;
  run: (bounds: DOMRect) => HTMLElement | void;
};
type Menu = {
  origin: HTMLElement;
  card: HTMLElement | null;
  box: HTMLDivElement;
  content: HTMLDivElement;
  opacity: string;
  controller: AbortController;
  backdrop: ReturnType<typeof acquireBackdrop>;
};
let active: Menu | undefined;
let finishClosing: (() => void) | undefined;

function dismiss(restoreFocus: boolean): void {
  const menu = active;
  if (!menu) return;
  active = undefined;
  menu.controller.abort();
  menu.backdrop.close();
  menu.origin.setAttribute("aria-expanded", "false");
  menu.box.inert = true;
  if (restoreFocus && menu.origin.isConnected) menu.origin.focus({ preventScroll: true });
  const reveal = () => {
    menu.origin.style.opacity = menu.opacity;
  };
  const done = () => {
    menu.box.remove();
    menu.backdrop.finish();
    menu.card?.removeAttribute("data-menu-open");
  };
  finishClosing = closeMotion(
    menu.box,
    menu.content,
    !menu.origin.isConnected ? null : menu.origin.getBoundingClientRect(),
    reveal,
    done,
  );
}

export function closeMenu(): void {
  dismiss(true);
}

function listen(menu: Menu, buttons: HTMLButtonElement[]): void {
  const options = { signal: menu.controller.signal };
  const anchor = menu.origin.getBoundingClientRect();
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) return;
      if (!menu.box.contains(event.target) && !menu.origin.contains(event.target)) dismiss(false);
    },
    options,
  );
  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        return;
      }
      const index = buttons.findIndex((button) => button === document.activeElement);
      let next: number | undefined;
      if (event.key === "ArrowDown") next = (index + 1) % buttons.length;
      if (event.key === "ArrowUp") next = (index - 1 + buttons.length) % buttons.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = buttons.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        buttons[next]?.focus();
      }
      if (event.key === "Tab") {
        // Restore the launcher's place in document order, then let native Tab advance.
        dismiss(true);
      }
    },
    { ...options, capture: true },
  );
  window.addEventListener(
    "scroll",
    (event) => {
      if (event.target instanceof Node && menu.box.contains(event.target)) return;
      const current = menu.origin.getBoundingClientRect();
      // A queued focus-scroll event may describe the position already used to place this menu.
      if (current.top === anchor.top && current.left === anchor.left) return;
      dismiss(false);
    },
    { ...options, capture: true },
  );
  window.addEventListener("resize", () => dismiss(false), options);
  window.addEventListener("blur", () => dismiss(false), options);
}

export function showMenu(origin: HTMLElement, items: readonly MenuItem[]): void {
  if (active?.origin === origin) {
    closeMenu();
    return;
  }
  if (!items.length || !origin.isConnected) return;
  const backdrop = acquireBackdrop();
  dismiss(false);
  finishClosing?.();
  finishClosing = undefined;
  const box = document.createElement("div");
  box.className = `gallery-menu ${galleryMenu}`;
  box.setAttribute("role", "menu");
  box.setAttribute(
    "aria-label",
    origin.getAttribute("aria-label") || origin.textContent || "Actions",
  );
  const content = document.createElement("div");
  content.className = `gallery-menu-content ${galleryMenuContent}`;
  box.append(content);
  const menu: Menu = {
    origin,
    card: origin.closest<HTMLElement>(".drawing-card"),
    box,
    content,
    opacity: origin.style.opacity,
    controller: new AbortController(),
    backdrop,
  };
  const buttons = items.map((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = menuButton;
    button.setAttribute("role", "menuitem");
    button.textContent = item.label;
    if (item.destructive) button.classList.add("destructive", destructive);
    button.addEventListener(
      "click",
      () => {
        if (active !== menu) return;
        // Commit intent before animation completion; closing/re-render cannot drop or repeat it.
        const bounds = menu.box.getBoundingClientRect();
        if (item.handoff || item.destructive) {
          active = undefined;
          menu.controller.abort();
          if (item.handoff) {
            menu.box.getAnimations({ subtree: true }).forEach((motion) => motion.cancel());
            menu.box.remove();
          }
          menu.origin.style.opacity = menu.opacity;
          menu.origin.setAttribute("aria-expanded", "false");
          menu.card?.removeAttribute("data-menu-open");
        } else closeMenu();
        const target = item.run(bounds);
        if (item.destructive) {
          menu.backdrop.close();
          finishClosing = morphDeleteMenu(box, content, bounds, target, () => box.remove());
        }
      },
      { signal: menu.controller.signal },
    );
    content.append(button);
    return button;
  });
  document.body.append(box);
  const anchor = placeMenu(box, content, origin);
  active = menu;
  menu.card?.setAttribute("data-menu-open", "true");
  origin.setAttribute("aria-haspopup", "menu");
  origin.setAttribute("aria-expanded", "true");
  origin.style.opacity = "0";
  listen(menu, buttons);
  openMotion(box, content, anchor);
  buttons[0]?.focus({ preventScroll: true });
}
