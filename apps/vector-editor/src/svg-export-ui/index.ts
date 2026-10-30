import { t } from "../../../web/src/locale";
import { exportOptions, type ExportOptions } from "./options";
import "./style.css";
type Phase = "preparing" | "rendering" | "encoding" | "paused" | "complete";
export function installSvgExportUi(actions: {
  canStart(): boolean;
  start(options: ExportOptions): Promise<Blob>;
  cancel(): void;
}) {
  const settings = document.querySelector<HTMLDialogElement>("#editor-settings")!;
  const canvas = document.querySelector("canvas")!;
  const button = document.createElement("button");
  button.id = "svg-export-open";
  button.textContent = t("svg.title");
  button.setAttribute("aria-haspopup", "dialog");
  button.setAttribute("aria-controls", "svg-export-options");
  settings.append(button);
  const dialog = document.createElement("dialog");
  dialog.id = "svg-export-options";
  dialog.className = "editor-panel svg-options";
  const title = document.createElement("h2");
  title.id = "svg-export-title";
  title.textContent = t("svg.title");
  dialog.setAttribute("aria-labelledby", title.id);
  dialog.append(title);
  const read = exportOptions(dialog);
  const start = document.createElement("button");
  start.id = "svg-export-start";
  start.textContent = t("svg.start");
  const close = document.createElement("button");
  close.textContent = t("svg.close");
  dialog.append(start, close);
  const notice = document.createElement("section");
  notice.id = "svg-export-notice";
  notice.hidden = true;
  notice.setAttribute("aria-label", t("svg.title"));
  const message = document.createElement("span");
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  const download = document.createElement("a");
  download.id = "svg-export-download";
  download.textContent = t("svg.download");
  download.download = "Linefield.svg";
  download.hidden = true;
  const cancel = document.createElement("button");
  cancel.textContent = t("svg.cancel");
  const dismiss = document.createElement("button");
  dismiss.textContent = t("svg.close");
  notice.append(message, download, cancel, dismiss);
  document.body.append(dialog, notice);
  let busy = false,
    cancelled = false,
    disposed = false,
    url = "";
  const release = () => {
    if (url) URL.revokeObjectURL(url);
    url = "";
    download.removeAttribute("href");
    download.hidden = true;
  };
  const hideOptions = () => {
    dialog.close();
    canvas.focus({ preventScroll: true });
  };
  close.onclick = hideOptions;
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    hideOptions();
  });
  button.onclick = () => {
    if (busy || !actions.canStart()) return;
    settings.close();
    dialog.showModal();
    start.focus();
  };
  dismiss.onclick = () => {
    release();
    notice.hidden = true;
    canvas.focus({ preventScroll: true });
  };
  cancel.onclick = () => {
    cancelled = true;
    actions.cancel();
  };
  start.onclick = async () => {
    if (busy) return;
    if (!actions.canStart()) {
      notice.hidden = false;
      message.textContent = t("svg.busy");
      cancel.hidden = true;
      return;
    }
    const options = read();
    hideOptions();
    release();
    busy = true;
    cancelled = false;
    button.disabled = true;
    notice.hidden = false;
    cancel.hidden = false;
    dismiss.hidden = true;
    message.textContent = t("svg.preparing");
    try {
      const blob = await actions.start(options);
      if (disposed) return;
      if (cancelled) {
        message.textContent = t("svg.cancelled");
        return;
      }
      url = URL.createObjectURL(blob);
      download.href = url;
      download.hidden = false;
      message.textContent = t("svg.ready");
    } catch (error) {
      if (disposed) return;
      const reason = String(error);
      message.textContent = cancelled
        ? t("svg.cancelled")
        : /limit|budget|extent|dimensions/.test(reason)
          ? t("svg.limit")
          : t("svg.failed");
    } finally {
      busy = false;
      button.disabled = false;
      cancel.hidden = true;
      dismiss.hidden = false;
    }
  };
  return {
    progress({ phase }: { phase: Phase }) {
      if (!busy || disposed || phase === "complete") return;
      const labels = {
        preparing: t("svg.preparing"),
        rendering: t("svg.rendering"),
        encoding: t("svg.encoding"),
        paused: t("svg.paused"),
      };
      const text = labels[phase];
      if (message.textContent !== text) message.textContent = text;
    },
    suspend() {
      cancelled = true;
      actions.cancel();
      release();
      if (dialog.open) dialog.close();
      notice.hidden = true;
    },
    dispose() {
      disposed = true;
      actions.cancel();
      release();
      dialog.remove();
      notice.remove();
      button.remove();
    },
  };
}
