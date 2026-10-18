import { button, element } from "./dom.ts";
import { t } from "./locale.ts";
import { drawingIcon } from "./drawing-icons.ts";
import { drawingRange } from "./drawing-range.ts";
import { record } from "./diagnostics.ts";
import "./drawing-controls.css.ts";
const tools = ["pen", "select", "eraser", "line", "shapes"] as const;
export function createDrawingShell(name: string, requestBack: () => void) {
  const root = element("div", "drawing-chrome");
  const header = element("header", "canvas-toolbar");
  const back = button(t("navigation.back"), "back", requestBack);
  const title = element("span", "canvas-title", name);
  title.dir = "auto";
  title.title = name;
  const settings = button(t("canvas.settingsUnavailable"), "drawing-tool", () => {});
  settings.replaceChildren(drawingIcon("settings"));
  settings.setAttribute("aria-label", t("canvas.settingsUnavailable"));
  settings.title = t("canvas.settingsUnavailable");
  settings.disabled = true;
  header.append(back, title, settings);
  const rail = element("div", "drawing-rail");
  rail.setAttribute("role", "group");
  rail.setAttribute("aria-label", t("canvas.tools"));
  const context = element("div", "drawing-context");
  const preview = element("div", "stroke-preview");
  preview.setAttribute("role", "img");
  preview.setAttribute("aria-label", t("canvas.strokePreview"));
  const stroke = drawingIcon("stroke");
  preview.append(stroke);
  let activeTool: (typeof tools)[number] = "pen";
  const refresh = () => {
    stroke.style.strokeWidth = String(Number(width.input.value) / 4);
    stroke.style.opacity =
      activeTool === "eraser" ? "1" : String(Number(opacity.input.value) / 100);
    stroke
      .querySelector("path")
      ?.setAttribute("stroke-width", String(Number(width.input.value) / 4));
  };
  const width = drawingRange("width", 8, refresh);
  const opacity = drawingRange("opacity", 100, refresh);
  const smoothing = drawingRange("smoothing", 25, refresh);
  const ranges = [width, opacity, smoothing];
  const empty = element("span", "context-empty", t("canvas.noSettings"));
  empty.hidden = true;
  context.append(width.label, preview, opacity.label, smoothing.label, empty);
  const buttons = tools.map((tool) => {
    const control = button(t(`canvas.${tool}`), "drawing-tool", () => {
      ranges.forEach((range) => range.cancel());
      activeTool = tool;
      refresh();
      buttons.forEach((node, index) =>
        node.setAttribute("aria-pressed", String(tools[index] === tool)),
      );
      width.label.hidden = tool === "select";
      opacity.label.hidden = tool === "select" || tool === "eraser";
      smoothing.label.hidden = tool !== "pen";
      preview.hidden = tool === "select";
      empty.hidden = tool !== "select";
      record("tool-selected");
    });
    control.setAttribute("aria-label", t(`canvas.${tool}`));
    control.title = t(`canvas.${tool}`);
    control.setAttribute("aria-pressed", String(tool === "pen"));
    control.replaceChildren(drawingIcon(tool));
    return control;
  });
  const color = button(t("canvas.colorUnavailable"), "drawing-tool drawing-color", () => {});
  color.replaceChildren(element("span", "color-swatch"));
  color.setAttribute("aria-label", t("canvas.colorUnavailable"));
  color.title = t("canvas.colorUnavailable");
  color.disabled = true;
  rail.append(...buttons, color);
  const notice = element("p", "canvas-notice", t("canvas.preview"));
  const zoom = element(
    "span",
    "canvas-zoom",
    new Intl.NumberFormat(navigator.language, { style: "percent" }).format(1),
  );
  zoom.setAttribute("aria-label", t("canvas.zoom"));
  const footer = element("div", "canvas-footer");
  footer.append(notice, zoom);
  root.append(header, rail, context, footer);
  ranges.forEach((range) => range.render());
  const cancel = () => ranges.forEach((range) => range.cancel());
  window.addEventListener("blur", cancel);
  window.addEventListener("resize", cancel);
  return {
    root,
    back,
    setReady(ready: boolean) {
      root.inert = !ready;
      root.style.visibility = ready ? "visible" : "hidden";
    },
    dispose() {
      cancel();
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
    },
  };
}
