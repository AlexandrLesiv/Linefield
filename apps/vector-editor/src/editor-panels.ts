import { installPanelAttention } from "./panel-attention";
import { t } from "../../web/src/locale";
import "./editor-panels.css";

/** Presentation only: existing controls keep their handlers and engine ownership. */
export function installEditorPanels() {
  let canOpen = () => true;
  const header = document.querySelector("header")!;
  const canvas = document.querySelector("canvas")!;
  for (const id of ["pan", "rotate", "rotation-reset", "undo", "redo", "reset"])
    document.querySelector<HTMLElement>(`#${id}`)!.hidden = true;
  const wordmark = header.querySelector("strong")!;
  const home = document.createElement("button");
  home.className = "editor-home";
  home.textContent = "Linefield";
  home.setAttribute("aria-label", t("library.back"));
  home.onclick = () => window.parent.postMessage({ kind: "linefield-gallery" }, location.origin);
  wordmark.replaceWith(home);
  function panel(id: string, title: string) {
    const dialog = document.createElement("dialog");
    dialog.id = id;
    dialog.className = "editor-panel";
    const heading = document.createElement("h2");
    heading.id = `${id}-title`;
    heading.textContent = title;
    dialog.setAttribute("aria-labelledby", heading.id);
    const close = document.createElement("button");
    close.className = "editor-panel-close";
    close.textContent = "×";
    close.setAttribute("aria-label", t("editor.closePanel"));
    dialog.append(heading, close);
    document.body.append(dialog);
    let previous: HTMLElement | null = null;
    const hide = () => {
      dialog.close();
      (previous?.isConnected ? previous : canvas).focus({ preventScroll: true });
    };
    close.onclick = hide;
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      hide();
    });
    const show = () => {
      if (dialog.open || !canOpen()) return;
      previous = document.activeElement instanceof HTMLElement ? document.activeElement : canvas;
      dialog.showModal();
      close.focus({ preventScroll: true });
    };
    return { dialog, show, hide };
  }
  const settings = panel("editor-settings", t("editor.settings"));
  const developer = panel("editor-developer", t("editor.developer"));
  const gear = document.createElement("button");
  gear.id = "editor-settings-toggle";
  gear.textContent = "⚙";
  gear.title = gear.ariaLabel = t("editor.settings");
  gear.setAttribute("aria-haspopup", "dialog");
  gear.setAttribute("aria-controls", "editor-settings");
  gear.onclick = settings.show;
  header.append(gear);
  settings.dialog.append(
    document.querySelector("#pressure-toggle")!,
    document.querySelector("#pressure-panel")!,
    document.querySelector(".background-controls")!,
  );
  const help = document.createElement("p");
  help.textContent = t("editor.developerShortcut");
  settings.dialog.append(help);
  const shortcuts = document.createElement("p");
  shortcuts.textContent = t("editor.shortcuts");
  settings.dialog.append(shortcuts);
  const recovery = document.createElement("button");
  recovery.textContent = t("editor.saveAttention");
  recovery.hidden = true;
  recovery.onclick = () => {
    settings.hide();
    developer.show();
  };
  settings.dialog.append(recovery);

  developer.dialog.append(document.querySelector(".notice")!, document.querySelector("#status")!);
  const disclosure = document.createElement("p");
  disclosure.textContent = t("save.local");
  developer.dialog.append(disclosure);
  const exportLog = document.createElement("button");
  exportLog.textContent = t("editor.exportLog");
  exportLog.onclick = () =>
    (
      window as Window & { lab?: { downloadInputDiagnostics(): void } }
    ).lab?.downloadInputDiagnostics();
  developer.dialog.append(exportLog);
  window.addEventListener(
    "keydown",
    (event) => {
      const stay = document.querySelector<HTMLElement>("#save-stay");
      if (stay && !stay.hidden) return;
      if (
        event.isComposing ||
        event.getModifierState("AltGraph") ||
        event.repeat ||
        event.defaultPrevented
      )
        return;
      if (
        event.ctrlKey &&
        event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        event.code === "KeyD"
      ) {
        if (
          event.target instanceof HTMLElement &&
          (event.target.isContentEditable || event.target.closest("input, textarea, select"))
        )
          return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (developer.dialog.open) developer.hide();
        else {
          if (settings.dialog.open) settings.hide();
          developer.show();
        }
      }
      if (event.key === "Escape" && (developer.dialog.open || settings.dialog.open)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (developer.dialog.open) developer.hide();
        else settings.hide();
      }
    },
    true,
  );
  installPanelAttention(gear, recovery, settings, developer);
  return {
    setCanOpen(check: () => boolean) {
      canOpen = check;
    },
  };
}
