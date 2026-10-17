import { reducedMotion } from "./dom.ts";

export function revealRemoval(node: HTMLElement | null, previous: HTMLElement | null): void {
  if (!node || reducedMotion()) return;
  const ghost = previous?.cloneNode(true);
  if (ghost instanceof HTMLElement) {
    ghost.classList.add("deletion-visual");
    ghost.inert = true;
    ghost.setAttribute("aria-hidden", "true");
    Object.assign(ghost.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      visibility: "visible",
      pointerEvents: "none",
      borderRadius: "inherit",
    });
    node.parentElement?.append(ghost);
    const fade = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180,
      easing: "ease-out",
      fill: "forwards",
    });
    void fade.finished.then(
      () => ghost.remove(),
      () => ghost.remove(),
    );
  }
  node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "ease-out" });
}
