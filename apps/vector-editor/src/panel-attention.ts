import { t } from "../../web/src/locale";
type Panel = { dialog: HTMLDialogElement; show(): void; hide(): void };
/** Failure signals stay visible without moving focus or interrupting input. */
export function installPanelAttention(
  gear: HTMLButtonElement,
  recovery: HTMLButtonElement,
  settings: Panel,
  developer: Panel,
) {
  let saveFailed = false,
    renderFailed = false,
    runtimeFailed = false,
    exitShowing = false;
  const alert = document.createElement("span");
  alert.className = "save-announcement";
  alert.setAttribute("role", "status");
  document.body.append(alert);
  function update() {
    const failed = saveFailed || renderFailed || runtimeFailed;
    recovery.hidden = !failed;
    const message =
      renderFailed || runtimeFailed ? t("editor.renderAttention") : t("editor.saveAttention");
    recovery.textContent = message;
    gear.ariaLabel = failed ? message : t("editor.settings");
    gear.title = gear.ariaLabel;
    gear.toggleAttribute("data-attention", failed);
    alert.textContent = failed ? message : "";
  }
  window.addEventListener("linefield-save-attention", (event) => {
    const state = (event as CustomEvent<string>).detail;
    if (["saved", "pending", "saving"].includes(state)) {
      if (exitShowing && developer.dialog.open) developer.hide();
      exitShowing = false;
    }
    if (state === "saved") saveFailed = false;
    if (state === "leaving" || state === "waitStroke") {
      if (settings.dialog.open) settings.hide();
      exitShowing = true;
      developer.show();
    } else if (["failed", "openFailed", "openInUse", "capacity"].includes(state)) {
      exitShowing = false;
      saveFailed = true;
    }
    update();
  });
  window.addEventListener("linefield-runtime-attention", (event) => {
    runtimeFailed = (event as CustomEvent<boolean>).detail;
    update();
  });
  window.addEventListener("linefield-render-attention", (event) => {
    renderFailed = (event as CustomEvent<boolean>).detail;
    update();
  });
}
