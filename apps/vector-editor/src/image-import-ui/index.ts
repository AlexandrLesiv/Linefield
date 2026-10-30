import { t } from "../../../web/src/locale";
import "./style.css";
export type ImagePhase = "decoding" | "staging" | "waiting" | "uploading";
export function installImageImportUi<Token>(actions: {
  begin(): Token | null;
  import(file: File, token: Token): Promise<void>;
  cancel(): void;
}) {
  const settings = document.querySelector<HTMLDialogElement>("#editor-settings")!;
  const canvas = document.querySelector("canvas")!;
  const open = document.createElement("button");
  open.id = "image-import-open";
  open.textContent = t("image.import");
  const input = document.createElement("input");
  input.id = "image-import-file";
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp";
  input.hidden = true;
  const help = document.createElement("small");
  help.textContent = t("image.formats");
  const group = document.createElement("div");
  group.className = "image-import-option";
  group.append(open, help, input);
  settings.append(group);
  const notice = document.createElement("section");
  notice.id = "image-import-notice";
  notice.hidden = true;
  notice.setAttribute("aria-label", t("image.import"));
  const message = document.createElement("span");
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");
  const cancel = document.createElement("button");
  cancel.textContent = t("image.cancel");
  const dismiss = document.createElement("button");
  dismiss.textContent = t("svg.close");
  notice.append(message, cancel, dismiss);
  document.querySelector("main")!.append(notice);
  let token: Token | null = null,
    busy = false,
    disposed = false,
    cancelled = false;
  open.onclick = () => {
    if (busy) return;
    token = actions.begin();
    if (token === null) {
      notice.hidden = false;
      message.textContent = t("image.busy");
      cancel.hidden = true;
      return;
    }
    input.value = "";
    input.click();
  };
  input.onchange = async () => {
    const file = input.files?.[0],
      captured = token;
    token = null;
    if (!file || captured === null || busy) return;
    settings.close();
    canvas.focus({ preventScroll: true });
    busy = true;
    cancelled = false;
    open.disabled = true;
    notice.hidden = false;
    cancel.hidden = false;
    dismiss.hidden = true;
    message.textContent = t("image.decoding");
    try {
      await actions.import(file, captured);
      if (!disposed) message.textContent = t("image.added");
    } catch (error) {
      if (!disposed) {
        const code = error instanceof Error ? error.message : "";
        message.textContent = t(
          cancelled || code.includes("cancel")
            ? "image.cancelled"
            : /limit|budget|capacity|texture/.test(code)
              ? "image.limit"
              : /layer|stale|protected/.test(code)
                ? "image.targetChanged"
                : "image.failed",
        );
      }
    } finally {
      busy = false;
      open.disabled = false;
      cancel.hidden = true;
      dismiss.hidden = false;
      input.value = "";
    }
  };
  cancel.onclick = () => {
    cancelled = true;
    actions.cancel();
  };
  dismiss.onclick = () => {
    notice.hidden = true;
    canvas.focus({ preventScroll: true });
  };
  return {
    phase(phase: ImagePhase) {
      if (!disposed && busy) message.textContent = t(`image.${phase}`);
    },
    dispose() {
      disposed = true;
      actions.cancel();
      group.remove();
      notice.remove();
    },
  };
}
