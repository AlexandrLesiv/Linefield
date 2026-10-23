import { toolbarCommands } from "../developer-diagnostics/intent.ts";
import { revealLabel } from "./control-visibility.ts";
import { controlPresentation, disabledActivation } from "./control-presentation.ts";
import { drawingIcon } from "../drawing-icons.ts";
import { button, element } from "../dom.ts";
import { drawingTool } from "../drawing-controls.css.ts";
import { t } from "../locale.ts";
import type { Bridge } from "./bridge.ts";
import { edit } from "./edit-bridge.ts";
import type { Commands } from "./input-state.ts";
import { colorInput, viewControls, viewButton, locked } from "./editor-controls.css.ts";
export function attachEditorControls(canvas: HTMLCanvasElement, source: Commands, api: Bridge) {
  const commands = toolbarCommands(source);
  const root = canvas.parentElement;
  if (!root) throw Error("editor-root");
  const rail = root.querySelector<HTMLElement>(".drawing-rail"),
    context = root.querySelector<HTMLElement>(".drawing-context"),
    footer = root.querySelector<HTMLElement>(".canvas-footer");
  if (!rail || !context || !footer) throw Error("editor-controls");
  const controller = new AbortController(),
    options = { signal: controller.signal };
  const width = context.querySelector<HTMLInputElement>("input[type='range']");
  const presentation = controlPresentation(width);
  const history = Array.from(context.querySelectorAll<HTMLButtonElement>("button"));
  const undo = history.find((b) => b.title === t("memory.undo")),
    redo = history.find((b) => b.title === t("memory.redo"));
  const pen = rail.querySelector<HTMLButtonElement>("button");
  const color = element("input", colorInput);
  color.type = "color";
  color.setAttribute("aria-label", t("canvas.color"));
  const oldColor = rail.querySelector<HTMLButtonElement>(".drawing-color");
  oldColor?.remove();
  rail.append(color);
  const modes: HTMLButtonElement[] = [];
  for (const [mode, label] of [
    ["pan", "memory.pan"],
    ["rotate", "memory.rotate"],
  ] as const) {
    const b = button(t(label), drawingTool, () => {
      if (commands.read().interaction) return;
      canvas.dataset.tool = mode;
      sync();
    });
    b.dataset.mode = mode;
    b.replaceChildren(drawingIcon(mode));
    b.setAttribute("aria-label", t(label));
    rail.insertBefore(b, color);
    modes.push(b);
  }
  pen?.addEventListener(
    "click",
    () => {
      if (!commands.read().interaction) {
        canvas.dataset.tool = "ink";
        sync();
      }
    },
    options,
  );
  const panel = element("div", viewControls),
    zoom = element("span");
  const zoomBy = (factor: number) => {
    const v = commands.view();
    commands.run((s) =>
      edit.view(s, Math.min(16, Math.max(0.05, v.zoom * factor)), v.width / 2, v.height / 2, false),
    );
  };
  const rotateBy = (delta: number) => {
    const v = commands.view();
    commands.run((s) => edit.view(s, v.angle + delta, v.width / 2, v.height / 2, true));
  };
  const minus = button(t("memory.zoomOut"), drawingTool, () => zoomBy(1 / 1.25)),
    plus = button(t("memory.zoomIn"), drawingTool, () => zoomBy(1.25));
  minus.textContent = "−";
  plus.textContent = "+";
  const left = button(t("memory.rotateLeft"), drawingTool, () => rotateBy(-Math.PI / 12)),
    right = button(t("memory.rotateRight"), drawingTool, () => rotateBy(Math.PI / 12));
  left.textContent = "↶";
  right.textContent = "↷";
  const reset = button(t("memory.resetAngle"), drawingTool, () => {
    const v = commands.view();
    commands.run((s) => edit.view(s, 0, v.width / 2, v.height / 2, true));
  });
  reset.textContent = "0°";
  for (const [b, key] of [
    [minus, "memory.zoomOut"],
    [plus, "memory.zoomIn"],
    [left, "memory.rotateLeft"],
    [right, "memory.rotateRight"],
    [reset, "memory.resetAngle"],
  ] as const)
    b.setAttribute("aria-label", t(key));
  const resetView = button(t("memory.resetView"), drawingTool, () =>
    commands.run((s) => edit.resetView(s)),
  );
  resetView.textContent = "⌖";
  resetView.setAttribute("aria-label", t("memory.resetView"));
  for (const b of [minus, plus, left, right, reset, resetView]) b.classList.add(viewButton);
  panel.append(minus, zoom, plus, left, reset, right, resetView);
  footer.querySelector(".canvas-zoom")?.remove();
  footer.append(panel);
  if (width) {
    width.disabled = false;
    width.addEventListener("focus", () => revealLabel(width), options);
    width.addEventListener(
      "input",
      () => {
        presentation.invalidate();
        const s = api.read(commands.read().owner);
        commands.run((v) => edit.style(v, Number(width.value), [s.red, s.green, s.blue]));
      },
      options,
    );
  }
  color.addEventListener(
    "input",
    () => {
      presentation.invalidate();
      const value = color.value;
      const rgb = [1, 3, 5].map((i) => Number.parseInt(value.slice(i, i + 2), 16) / 255);
      commands.run((s) => edit.style(s, Number(width?.value ?? 8), rgb));
    },
    options,
  );
  undo?.addEventListener("click", () => commands.run((s) => edit.undo(s)), options);
  redo?.addEventListener("click", () => commands.run((s) => edit.undo(s, true)), options);
  for (const type of ["pointerdown", "click", "keydown"] as const)
    root.addEventListener(
      type,
      (e) => {
        if (disabledActivation(e)) {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      { ...options, capture: true },
    );
  function sync() {
    const s = api.read(commands.read().owner),
      v = commands.view(),
      busy = s.interaction !== 0n;
    if (!presentation.changed(s, v, canvas.dataset.tool ?? "ink")) return;
    if (width) {
      width.value = String(s.width);
      const text = presentation.number.format(s.width);
      if (presentation.label) presentation.label.textContent = text;
      width.setAttribute("aria-valuetext", text);
      width.setAttribute("aria-disabled", String(busy));
      width.classList.toggle(locked, busy);
    }
    color.value = `#${[s.red, s.green, s.blue]
      .map((n) =>
        Math.round(n * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")}`;
    for (const control of [color, pen, minus, plus, left, right, reset, resetView]) {
      if (!control) continue;
      // M03 view and ink admission share Rust ready + idle; separate before M06 layer gating.
      const unavailable = panel.contains(control) ? !s.canBeginInk : busy;
      control.setAttribute("aria-disabled", String(unavailable));
      control.classList.toggle(locked, unavailable);
    }
    for (const [b, available] of [
      [undo, s.canUndo],
      [redo, s.canRedo],
    ] as const) {
      if (!b) continue;
      b.disabled = false;
      b.setAttribute("aria-disabled", String(!available));
      b.classList.toggle(locked, !available);
    }
    if (pen) {
      pen.disabled = false;
      pen.title = t("canvas.pen");
      pen.setAttribute("aria-pressed", String((canvas.dataset.tool ?? "ink") === "ink"));
    }
    for (const b of modes) {
      b.setAttribute("aria-pressed", String(canvas.dataset.tool === b.dataset.mode));
      b.setAttribute("aria-disabled", String(busy));
      b.classList.toggle(locked, busy);
    }
    zoom.textContent = presentation.percent.format(v.zoom);
    reset.textContent = `${Math.round((v.angle * 180) / Math.PI)}°`;
  }
  root
    .querySelector<HTMLElement>("#memory-disclosure")
    ?.replaceChildren(document.createTextNode(t("memory.lifetime")));
  sync();
  return {
    sync,
    dispose() {
      controller.abort();
      color.remove();
      panel.remove();
      for (const b of modes) b.remove();
    },
  };
}
