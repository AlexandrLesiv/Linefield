import { toolIcon, propertyIcon, strokeIcon } from "./drawing-controls.css.ts";
const paths = {
  undo: "M9 5 4 10l5 5M4 10h10a6 6 0 0 1 0 12",
  redo: "m15 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12",
  pen: "M12 3 5 16l4 3h6l4-3L12 3Zm0 0v10m-3 8h6",
  select: "M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4",
  eraser: "m4 15 10-11 7 7-10 11H9l-5-5Zm4-4 7 7",
  line: "M4 20 20 4",
  shapes: "M12 9a5 5 0 1 0-5 5m4-3h10v10H11Z",
  settings:
    "m9 3-1 3-3 1-2 3 2 2-1 3 3 2 2-1 3 2 3-2 2 1 3-2-1-3 2-2-2-3-3-1-1-3H9Zm7 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  opacity: "M12 3a9 9 0 1 0 0 18V3Zm0 0a9 9 0 0 1 0 18",
  smoothing: "M3 15c8-18 3 14 10-1s2 12 8 0",
  width: "M4 6h16M4 12h16M4 18h16",
  stroke: "M2 15Q7 5 12 13T23 9",
} as const;
export type DrawingIcon = keyof typeof paths;
export function drawingIcon(name: DrawingIcon): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute(
    "class",
    name === "stroke"
      ? strokeIcon
      : ["width", "opacity", "smoothing"].includes(name)
        ? propertyIcon
        : toolIcon,
  );
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  const path = document.createElementNS(svg.namespaceURI, "path");
  path.setAttribute("d", paths[name]);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.7");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}
