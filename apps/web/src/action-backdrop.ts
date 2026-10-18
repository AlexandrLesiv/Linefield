import "./action-backdrop.css.ts";
import { reducedMotion } from "./dom.ts";

let current: HTMLElement | undefined;
let motion: Animation | undefined;
let owner = 0;
matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", () => motion?.finish());

/** One visual scrim survives the menu-to-modal handoff; the dialog keeps native modality. */
export function acquireBackdrop() {
  const token = ++owner;
  const node = current ?? document.createElement("div");
  const initial = current ? getComputedStyle(node).opacity : "0";
  motion?.cancel();
  if (!current) {
    node.className = "action-backdrop";
    node.setAttribute("aria-hidden", "true");
    document.body.append(node);
    current = node;
  }
  const remove = () => {
    if (owner !== token) return;
    motion?.cancel();
    motion = undefined;
    node.remove();
    current = undefined;
  };
  const animate = (opacity: string, duration: number) => {
    const from = getComputedStyle(node).opacity;
    motion?.cancel();
    motion = node.animate([{ opacity: from }, { opacity }], {
      duration: reducedMotion() ? 0 : duration,
      fill: "both",
      easing: "ease-out",
    });
    return motion;
  };
  node.style.opacity = initial;
  animate("1", 160);
  return {
    finish: remove,
    close(duration = 200) {
      if (owner !== token) return;
      const closing = animate("0", duration);
      void closing.finished.then(remove, () => {});
    },
  };
}
