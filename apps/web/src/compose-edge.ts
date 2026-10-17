/** A decorative perimeter keeps the floating paper separate from gallery paper. */
export function attachComposeEdge(surface: HTMLElement, source: HTMLElement): void {
  if (!source.matches(".iphone-create")) return;
  const edge = document.createElement("div");
  edge.className = "compose-edge";
  edge.setAttribute("aria-hidden", "true");
  edge.style.borderColor = getComputedStyle(source).borderColor;
  surface.append(edge);
}

export function animateComposeEdge(
  surface: HTMLElement,
  closing: boolean,
  opacity: number,
  timing: KeyframeAnimationOptions,
): Animation | null {
  const edge = surface.querySelector<HTMLElement>(".compose-edge");
  if (!edge) return null;
  edge.style.opacity = "0";
  return edge.animate(
    closing
      ? [{ opacity }, { opacity: 1, offset: 0.08 }, { opacity: 1 }]
      : [{ opacity }, { opacity: 1, offset: 0.8 }, { opacity: 0 }],
    { ...timing, easing: "linear" },
  );
}
