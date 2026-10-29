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
}
