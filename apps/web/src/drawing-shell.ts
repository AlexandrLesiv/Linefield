import {
  drawingTool,
  strokePreview,
  contextEmpty,
  drawingColor,
  colorSwatch,
} from "./drawing-controls.css.ts";
import {
  drawingChrome,
  canvasToolbar,
  back as backStyle,
  canvasTitle,
  drawingRail,
  drawingContext,
  canvasNotice,
  canvasFooter,
  canvasZoom,
  settingsControl,
} from "./canvas.css.ts";
import { button, element } from "./dom.ts";
import { t } from "./locale.ts";
import { drawingIcon } from "./drawing-icons.ts";
import { drawingRange } from "./drawing-range.ts";
import { record } from "./diagnostics.ts";
const tools = ["pen", "select", "eraser", "line", "shapes"] as const;
export function createDrawingShell(name: string, requestBack: () => void) {
  const root = element("div", `drawing-chrome ${drawingChrome}`);
  const header = element("header", `canvas-toolbar ${canvasToolbar}`);
  const back = button(t("navigation.back"), `back ${backStyle}`, requestBack);
  const title = element("span", `canvas-title ${canvasTitle}`, name);
  title.dir = "auto";
  title.title = name;
  const settings = button(t("canvas.settingsUnavailable"), `drawing-tool ${drawingTool}`, () => {});
  settings.replaceChildren(drawingIcon("settings"));
  settings.setAttribute("aria-label", t("canvas.settingsUnavailable"));
  settings.title = t("canvas.settingsUnavailable");
  settings.disabled = true;
  settings.classList.add(settingsControl);
  header.append(back, title, settings);
  const rail = element("div", `drawing-rail ${drawingRail}`);
  rail.setAttribute("role", "group");
  rail.setAttribute("aria-label", t("canvas.tools"));
  const context = element("div", `drawing-context ${drawingContext}`);
  const preview = element("div", `stroke-preview ${strokePreview}`);
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
  const empty = element("span", `context-empty ${contextEmpty}`, t("canvas.noSettings"));
  empty.hidden = true;
  context.append(width.label, preview, opacity.label, smoothing.label, empty);
  const buttons = tools.map((tool) => {
    const control = button(t(`canvas.${tool}`), `drawing-tool ${drawingTool}`, () => {
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
  const color = button(
    t("canvas.colorUnavailable"),
    `drawing-tool drawing-color ${drawingTool} ${drawingColor}`,
    () => {},
  );
  color.replaceChildren(element("span", `color-swatch ${colorSwatch}`));
  color.setAttribute("aria-label", t("canvas.colorUnavailable"));
  color.title = t("canvas.colorUnavailable");
  color.disabled = true;
  rail.append(...buttons, color);
  const notice = element("p", `canvas-notice ${canvasNotice}`, t("canvas.preview"));
  const zoom = element(
    "span",
    `canvas-zoom ${canvasZoom}`,
    new Intl.NumberFormat(navigator.language, { style: "percent" }).format(1),
  );
  zoom.setAttribute("aria-label", t("canvas.zoom"));
  const footer = element("div", `canvas-footer ${canvasFooter}`);
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
