import { t } from "../../../web/src/locale";
export function textSheet() {
  const dialog = document.createElement("dialog");
  dialog.id = "text-editor";
  const title = document.createElement("h2"),
    input = document.createElement("textarea"),
    error = document.createElement("p"),
    fallback = document.createElement("p"),
    status = document.createElement("p"),
    actions = document.createElement("div"),
    done = document.createElement("button"),
    cancel = document.createElement("button");
  title.id = "text-title";
  dialog.setAttribute("aria-labelledby", title.id);
  input.id = "text-input";
  input.wrap = "soft";
  input.rows = 5;
  input.setAttribute("aria-label", t("text.field"));
  input.spellcheck = false;
  error.id = "text-error";
  error.setAttribute("role", "alert");
  fallback.id = "text-fallback";
  fallback.textContent = t("text.fallback");
  fallback.hidden = true;
  status.textContent = t("text.draft");
  status.hidden = true;
  done.id = "text-done";
  done.textContent = t("text.done");
  cancel.id = "text-cancel";
  cancel.textContent = t("text.cancel");
  actions.append(cancel, done);
  dialog.append(title, input, fallback, status, error, actions);
  const help = document.createElement("p");
  help.id = "text-help";
  input.setAttribute("aria-describedby", "text-help text-error");
  help.textContent = t("text.help");
  title.after(help);
  document.body.append(dialog);
  let composing = false;
  input.addEventListener("compositionstart", () => {
    composing = true;
    done.disabled = true;
  });
  input.addEventListener("compositionend", () => {
    composing = false;
    done.disabled = false;
  });
  dialog.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.isComposing || composing) {
      if (event.key === "Escape") event.preventDefault();
    }
  });
  return {
    dialog,
    input,
    error,
    fallback,
    status,
    done,
    cancel,
    composing: () => composing,
    open(edit: boolean, content: string) {
      composing = false;
      done.disabled = false;
      input.readOnly = false;
      title.textContent = t(edit ? "text.edit" : "text.add");
      input.value = content;
      error.textContent = "";
      fallback.hidden = true;
      status.hidden = true;
      dialog.showModal();
      input.focus();
      input.setSelectionRange(content.length, content.length);
    },
  };
}
