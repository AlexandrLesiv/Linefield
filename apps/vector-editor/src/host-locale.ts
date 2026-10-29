import { t } from "../../web/src/locale";

/** One-time host copy adaptation; never observes or changes drawing state. */
export function installHostLocale(): void {
  document.querySelector("#pen")!.textContent = t("vector.pen");
  document.querySelector("#select")!.textContent = t("vector.select");
  document.querySelector("#slice")!.textContent = t("vector.slice");
  document.querySelector("#pan")!.textContent = t("vector.pan");
  document.querySelector("#rotate")!.textContent = t("vector.rotate");
  document.querySelector("#pressure-toggle")!.textContent = t("vector.pressure");
  document.querySelector("#undo")!.textContent = t("vector.undo");
  document.querySelector("#redo")!.textContent = t("vector.redo");
  document.querySelector('#brush option[value="0"]')!.textContent = t("vector.ink");
  document.querySelector('#brush option[value="1"]')!.textContent = t("vector.hard");
  document.querySelector('#brush option[value="2"]')!.textContent = t("vector.soft");
  document.querySelector('#paper-style option[value="none"]')!.textContent = t("vector.paperNone");
  document.querySelector('#paper-style option[value="warm"]')!.textContent = t("vector.paperWarm");
  document.querySelector('#paper-style option[value="white"]')!.textContent =
    t("vector.paperWhite");
  document.querySelector('#grid-style option[value="none"]')!.textContent = t("vector.gridNone");
  document.querySelector('#grid-style option[value="notebook"]')!.textContent =
    t("vector.gridNotebook");
  document.querySelector('#grid-style option[value="dots"]')!.textContent = t("vector.gridDots");
  document.querySelector(".background-controls legend")!.textContent = t("vector.background");
  document.querySelector(".notice")!.textContent = t("vector.notSaved");
  document.querySelector("#pressure-panel h2")!.textContent = t("vector.pressureTitle");
  document.querySelector("#pressure-steeper")!.textContent = t("vector.steeper");
  document.querySelector("#pressure-original")!.textContent = t("vector.original");
  {
    const label = document.querySelector("#brush")!.closest("label")!;
    const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (text) text.textContent = t("vector.brush") + " ";
  }
  {
    const label = document.querySelector("#width")!.closest("label")!;
    const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (text) text.textContent = t("vector.width") + " ";
  }
  {
    const label = document.querySelector("#color")!.closest("label")!;
    const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (text) text.textContent = t("vector.color") + " ";
  }
  {
    const label = document.querySelector("#opacity")!.closest("label")!;
    const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (text) text.textContent = t("vector.opacity") + " ";
  }
  {
    const label = document.querySelector("#paper-style")!.closest("label")!;
    const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (text) text.textContent = t("vector.paper") + " ";
  }
  {
    const label = document.querySelector("#grid-style")!.closest("label")!;
    const text = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE);
    if (text) text.textContent = t("vector.grid") + " ";
  }
  document.querySelector("#pressure-panel > p:first-of-type")!.textContent =
    t("vector.adjustPressure");
  {
    const label = document.querySelector("#fixed-width")!.closest("label")!;
    const text = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (text) text.textContent = " " + t("vector.fixedWidth") + " ";
  }
  document.querySelector("#pressure-panel > p:nth-of-type(2)")!.textContent =
    t("vector.pressureRecorded");
  {
    const label = document.querySelector('label[for="pressure-curve"]')!;
    const text = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (text) text.textContent = " " + t("vector.pressureCurve") + " ";
  }
  document.querySelector("#pressure-help")!.textContent = t("vector.pressureHelp");
  {
    const label = document.querySelector('label[for="pressure-min"]')!;
    const text = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (text) text.textContent = " " + t("vector.minimumWidth") + " ";
  }
  document.querySelector("#pressure-chart-title")!.textContent = t("vector.pressureChart");
  document.querySelector("#pressure-chart-desc")!.textContent = t("vector.pressureChartDesc");
  document.querySelector(".pressure-chart text:first-of-type")!.textContent =
    t("vector.pressureAxis");
  document.querySelector(".pressure-chart text:last-of-type")!.textContent = t("vector.widthAxis");
  document.querySelector('label[for="pressure-live"]')!.textContent = t("vector.incomingPressure");
  document
    .querySelector("#pressure-meter")!
    .setAttribute("aria-label", t("vector.incomingPenPressure"));
  document.querySelector(".pressure-note")!.textContent = t("vector.pressureNote");
  document.querySelector("#layers-panel h2")!.textContent = t("vector.layersTitle");
  document.querySelector("#layer-add")!.textContent = t("vector.newLayer");
  document.querySelector("#layers-close")!.setAttribute("aria-label", t("vector.closeLayers"));
  document.querySelector(".layers-help")!.textContent = t("vector.layersHelp");
  document.querySelector("#selection-lasso-mode")!.textContent = t("vector.lasso");
  document.querySelector("#selection-pick-mode")!.textContent = t("vector.pick");
  {
    const label = document.querySelector("#selection-partial")!.closest("label")!;
    const text = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (text) text.textContent = " " + t("vector.partialStrokes") + " ";
  }
  {
    const label = document.querySelector("#selection-active-layer")!.closest("label")!;
    const text = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (text) text.textContent = " " + t("vector.activeLayerOnly") + " ";
  }
  document.querySelector("#selection-more")!.textContent = t("vector.lassoMore");
  document.querySelector("#selection-clear")!.textContent = t("vector.clearSelection");
  {
    const label = document.querySelector("#slice-width")!.closest("label")!;
    const text = [...label.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
    );
    if (text) text.textContent = " " + t("vector.sliceWidth") + " ";
  }
  document
    .querySelector("#slice-width-number")!
    .setAttribute("aria-label", t("vector.sliceWidthUnits"));
  document.querySelector("#slice-zero")!.textContent = t("vector.zeroCut");
  document.querySelector("#slice-zero")!.setAttribute("title", t("vector.zeroCutHelp"));
  document.querySelector("#slice-help")!.textContent = t("vector.sliceHelp");
  document.querySelector("aside")!.textContent = t("vector.navigationHelp");
  document.querySelector("#select")!.setAttribute("title", t("vector.selectHelp"));
  document.querySelector("#slice")!.setAttribute("title", t("vector.sliceToolHelp"));
  document.querySelector("#rotate")!.setAttribute("title", t("vector.rotateHelp"));
  document.querySelector("#rotation-reset")!.setAttribute("aria-label", t("vector.resetRotation"));
  document.querySelector("#rotation-reset")!.setAttribute("title", t("vector.resetRotationHelp"));
  document.querySelector('label[for="opacity"]')!.setAttribute("title", t("vector.opacityHelp"));
  document.querySelector('label[for="grid-style"]')!.setAttribute("title", t("vector.gridHelp"));
  document
    .querySelector("#selection-partial")!
    .closest("label")!
    .setAttribute("title", t("vector.partialHelp"));
  document
    .querySelector("#selection-controls")!
    .setAttribute("aria-label", t("vector.selectionOptions"));
  document.querySelector("#slice-controls")!.setAttribute("aria-label", t("vector.sliceOptions"));
  document.querySelector("#slice-active-layer")!.closest("label")!.lastChild!.textContent =
    " " + t("vector.activeLayerOnly");
  document.querySelector("#layers-panel")!.setAttribute("aria-label", t("vector.layersTitle"));
  document.querySelector("#pressure-panel")!.setAttribute("aria-label", t("vector.pressureTitle"));
  document.querySelector("#opacity")!.setAttribute("aria-label", t("vector.opacity"));
  document.querySelector("canvas")!.setAttribute("aria-label", t("memory.canvas"));
  document.title = "Linefield";
  document.querySelector("header > strong")!.textContent = "Linefield";
}
