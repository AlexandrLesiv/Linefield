import { resolved } from "../../../shared/theme/resolve";

/** Host presentation only. Artwork/material colors and WebGL state are untouched. */
export function installHostTheme(): void {
  const preference = matchMedia("(prefers-color-scheme: dark)");
  const roles = {
    panel: "surface.panel",
    text: "text.primary",
    muted: "text.secondary",
    line: "border.default",
    focus: "focus.ring",
    hover: "action.secondary.hover",
  } as const;
  function apply() {
    const scheme = preference.matches ? resolved.dark : resolved.light;
    for (const [name, role] of Object.entries(roles))
      document.documentElement.style.setProperty(`--editor-${name}`, scheme[role]);
    document.documentElement.style.colorScheme = preference.matches ? "dark" : "light";
  }
  apply();
  preference.addEventListener("change", apply);
  const style = document.createElement("style");
  style.textContent = `
    body, header, footer, #pressure-panel, #layers-panel, .layer-row,
    .background-controls, #slice-controls, #selection-controls {
      background: var(--editor-panel); color: var(--editor-text); border-color: var(--editor-line);
    }
    button, select, header select, .background-controls select, #selection-controls select, input:not([type="range"]):not([type="color"]) {
      background-color: var(--editor-panel); color: var(--editor-text); border-color: var(--editor-line);
    }
    .background-controls legend { color: var(--editor-text); background: var(--editor-panel); }
    .notice { color: var(--editor-muted); }
    button[aria-pressed="true"] { background: var(--editor-text); color: var(--editor-panel); }
    button:not(:disabled):not([aria-pressed="true"]):hover { background: var(--editor-hover); }
    button:focus-visible, select:focus-visible, input:focus-visible {
      outline: 2px solid var(--editor-focus); outline-offset: 2px;
    }
    canvas:focus-visible { outline: 2px solid var(--editor-focus); outline-offset: -2px; }
    #pressure-panel p, #pressure-panel .pressure-example, .layers-help, #layer-message, #slice-help {
      color: var(--editor-muted);
    }
    .pressure-chart text { fill: var(--editor-muted); }
    .chart-axis { stroke: var(--editor-line); }
    .chart-response { stroke: var(--editor-text); }
    .layer-row.active { border-color: var(--editor-focus); box-shadow: 0 0 0 1px var(--editor-focus); }
    input[type="range"], #pressure-panel input[type="range"] { accent-color: var(--editor-text); }
  `;
  document.head.append(style);
}
