import { t } from "../../../web/src/locale";
import type { ExportOptions } from "../svg-export/types";
export type { ExportOptions };
export function exportOptions(dialog: HTMLDialogElement) {
  const description = document.createElement("p");
  description.textContent = t("svg.disclosure");
  const region = document.createElement("p");
  region.textContent = t("svg.region");
  const background = document.createElement("select");
  background.id = "svg-background";
  for (const [value, label] of [
    ["current", t("svg.current")],
    ["white", t("svg.white")],
    ["transparent", t("svg.transparent")],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    background.append(option);
  }
  const density = document.createElement("select");
  density.id = "svg-density";
  for (const value of [1, 2, 4]) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = `${value}×`;
    density.append(option);
  }
  density.value = "2";
  const grid = document.createElement("input");
  grid.id = "svg-grid";
  grid.type = "checkbox";
  const label = (text: string, control: HTMLElement) => {
    const element = document.createElement("label");
    element.append(document.createTextNode(text), control);
    return element;
  };
  const hint = document.createElement("p");
  hint.textContent = t("svg.transparentGrid");
  hint.hidden = true;
  background.onchange = () => {
    grid.disabled = background.value === "transparent";
    if (grid.disabled) grid.checked = false;
    hint.hidden = !grid.disabled;
  };
  dialog.append(
    description,
    region,
    label(t("svg.background"), background),
    label(t("svg.density"), density),
    label(t("svg.grid"), grid),
    hint,
  );
  return (): ExportOptions => ({
    background: background.value as ExportOptions["background"],
    density: Number(density.value) as ExportOptions["density"],
    grid: grid.checked,
  });
}
