/** Browser approximation; native Apple hosts use their system symbol. */
export function documentPlus(): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const icon = document.createElementNS(ns, "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "22");
  icon.setAttribute("height", "22");
  icon.setAttribute("fill", "none");
  icon.setAttribute("stroke", "currentColor");
  icon.setAttribute("stroke-width", "1.6");
  icon.setAttribute("stroke-linecap", "round");
  icon.setAttribute("stroke-linejoin", "round");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  const path = document.createElementNS(ns, "path");
  path.setAttribute(
    "d",
    "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5v5h5M12 11v7M8.5 14.5h7",
  );
  icon.append(path);
  return icon;
}

/** Compose symbol for the browser's Apple control preview. */
export function composeIcon(): SVGSVGElement {
  const icon = documentPlus();
  icon
    .querySelector("path")
    ?.setAttribute(
      "d",
      "M13 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M10 14l1-4L19 2l3 3-8 8-4 1M17 4l3 3",
    );
  return icon;
}
