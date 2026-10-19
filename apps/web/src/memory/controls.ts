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
  if (width) width.input.max = "512";
  for (const range of ranges.slice(1)) range.label.remove();
  context.append(
    element("span", fixed, t("memory.opacityFixed")),
    element("span", fixed, t("memory.smoothingOff")),
  );
  for (const id of ["memory.redo", "memory.undo"] as const) {
    const control = button(t(id), drawingTool, () => {});
    control.disabled = true;
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
