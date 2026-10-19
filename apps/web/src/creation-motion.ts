import { theme } from "./theme.css.ts";
/** Preserve the actual creation tile's content and theme without making another control. */
export function attachCreationVisual(surface: HTMLElement, source: HTMLElement): void {
  if (!source.matches(".new-tile")) return;
  const appearance = getComputedStyle(source);
  surface.style.backgroundColor = appearance.backgroundColor;
  const visual = source.cloneNode(true);
  if (!(visual instanceof HTMLElement)) return;
  visual.classList.add("creation-visual");
  visual.inert = true;
  visual.setAttribute("aria-hidden", "true");
  visual.removeAttribute("aria-label");
  Object.assign(visual.style, {
    position: "absolute",
    inset: "0",
    visibility: "visible",
    background: "transparent",
    color: appearance.color,
    borderColor: appearance.borderColor,
    boxShadow: "none",
    filter: "none",
    pointerEvents: "none",
    transition: "none",
  });
  surface.append(visual);
}

export function readSurfaceAppearance(surface: HTMLElement) {
  const label = surface.querySelector<HTMLElement>(".creation-visual");
  return {
    background: getComputedStyle(surface).backgroundColor,
    radius: getComputedStyle(surface).borderRadius,
    shadow: getComputedStyle(surface).boxShadow,
    opacity: label ? Number(getComputedStyle(label).opacity) : 0,
  };
}

export function animateCreationVisual(
  surface: HTMLElement,
  closing: boolean,
  opacity: number,
  timing: KeyframeAnimationOptions,
): Animation | null {
  const label = surface.querySelector<HTMLElement>(".creation-visual");
  if (!label) return null;
  // Underlying styles are the steady drawing state after the animations are removed.
  label.style.opacity = "0";
  surface.style.backgroundColor = theme.paper;
  return label.animate(
    closing
      ? [{ opacity }, { opacity, offset: 0.5 }, { opacity: 1 }]
      : [{ opacity }, { opacity: 0, offset: 0.5 }, { opacity: 0 }],
    { ...timing, easing: "linear" },
  );
}
