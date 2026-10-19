import { drawingIcon } from "../drawing-icons.ts";
import { t } from "../locale.ts";
import { button, element } from "../dom.ts";
import { drawingTool } from "../drawing-controls.css.ts";
import {
  fixed,
  lifetime,
  foundationChrome,
  foundationHeader,
  foundationFooter,
  colorInput,
} from "./view.css.ts";
export function applyFoundationControls(
  root: HTMLElement,
  rail: HTMLElement,
  context: HTMLElement,
  notice: HTMLElement,
  ranges: { label: HTMLElement; input: HTMLInputElement }[],
): void {
  root.classList.add(foundationChrome);
  root.querySelector("header")?.classList.add(foundationHeader);
  notice.parentElement?.classList.add(foundationFooter);
  rail.setAttribute("aria-label", t("memory.tools"));
  for (const control of root.querySelectorAll<HTMLButtonElement>(".drawing-tool")) {
    const name = control.getAttribute("aria-label") ?? "";
    control.disabled = true;
    control.title = t("memory.toolUnavailable", { tool: name });
  }
  for (const range of ranges) range.input.disabled = true;
  const width = ranges[0];
  if (width) {
    const input = document.createElement("input");
    input.type = "range";
    input.min = "1";
    input.max = "512";
    input.step = "1";
    input.value = "8";
    input.className = width.input.className;
    input.setAttribute("aria-label", t("canvas.width"));
    input.dataset.memoryWidth = "";
    input.disabled = true;
    width.input.replaceWith(input);
  }
  const oldPen = rail.querySelector<HTMLButtonElement>("button");
  const pen = button(t("canvas.pen"), `drawing-tool ${drawingTool}`, () => {});
  pen.disabled = true;
  pen.replaceChildren(drawingIcon("pen"));
  pen.setAttribute("aria-label", t("canvas.pen"));
  pen.setAttribute("aria-pressed", "true");
  oldPen?.replaceWith(pen);
  if (pen) {
    pen.dataset.memoryPen = "";
    pen.title = t("canvas.pen");
  }
  const oldColor = rail.querySelector(".drawing-color");
  const color = document.createElement("input");
  color.type = "color";
  color.value = "#000000";
  color.className = `${drawingTool} ${colorInput}`;
  color.dataset.memoryColor = "";
  color.disabled = true;
  color.setAttribute("aria-label", t("memory.color"));
  color.title = t("memory.color");
  oldColor?.replaceWith(color);
  for (const range of ranges.slice(1)) range.label.remove();
  context.append(
    element("span", fixed, t("memory.opacityFixed")),
    element("span", fixed, t("memory.smoothingOff")),
  );
  for (const id of ["memory.redo", "memory.undo"] as const) {
    const control = button(t(id), drawingTool, () => {});
    control.disabled = true;
    control.dataset[id === "memory.undo" ? "memoryUndo" : "memoryRedo"] = "";
    control.setAttribute("aria-label", t(id));
    control.title = t(id);
    control.replaceChildren(drawingIcon(id === "memory.undo" ? "undo" : "redo"));
    context.prepend(control);
  }
  notice.id = "memory-disclosure";
  notice.classList.add(lifetime);
  notice.tabIndex = 0;
  notice.textContent = t("memory.lifetime") + " " + t("memory.foundation");
}
