import {
  renameDialog,
  error as errorStyle,
  dialogActions,
  primary,
  dialogHeading,
  dialogLabel,
  dialogInput,
  dialogButton,
} from "./dialog.css.ts";
import { acquireBackdrop } from "./action-backdrop.ts";
import { t } from "./locale.ts";
import { exitRename } from "./rename-exit.ts";
import { morphRename } from "./rename-motion.ts";
import { button, element } from "./dom.ts";
export function renameDrawing(
  name: string,
  save: (name: string) => Promise<void> | void,
  restore: () => void,
  sourceBounds: DOMRect,
  sourceCard: HTMLElement | null,
): void {
  const backdrop = acquireBackdrop();
  const dialog = element("dialog", `rename-dialog ${renameDialog}`);
  const form = element("form");
  const heading = element("h2", dialogHeading, t("rename.title"));
  heading.id = "rename-heading";
  dialog.setAttribute("aria-labelledby", heading.id);
  const label = element("label", dialogLabel, t("rename.label"));
  const input = element("input", dialogInput);
  input.value = name;
  input.maxLength = 512;
  input.required = true;
  label.append(input);
  const error = element("p", `error ${errorStyle}`);
  error.setAttribute("role", "alert");
  const actions = element("div", `dialog-actions ${dialogActions}`);
  let closed = false,
    pending = false;
  let disposeMotion = () => {};
  const cardId = sourceCard?.dataset.id;
  const liveCard = () =>
    cardId ? document.querySelector<HTMLElement>(`[data-id="${CSS.escape(cardId)}"]`) : sourceCard;
  const close = () => {
    if (closed || pending) return;
    closed = true;
    backdrop.close(260);
    const trigger = liveCard()?.querySelector<HTMLElement>(".more") ?? null;
    const done = () => {
      sourceCard?.removeAttribute("data-renaming");
      liveCard()?.removeAttribute("data-renaming");
      backdrop.finish();
      dialog.close();
      dialog.remove();
      const currentTrigger = liveCard()?.querySelector<HTMLElement>(".more");
      if (currentTrigger) currentTrigger.focus({ preventScroll: true });
      else restore();
    };
    exitRename(dialog, form, trigger, disposeMotion, done);
  };
  const submit = element("button", `primary ${primary} ${dialogButton}`, t("action.rename"));
  submit.type = "submit";
  const cancel = button(t("action.cancel"), dialogButton, close);
  actions.append(cancel, submit);
  form.append(heading, label, error, actions);
  dialog.append(form);
  document.body.append(dialog);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (closed || pending) return;
    const value = input.value.trim();
    if (!value) {
      error.textContent = t("rename.required");
      return;
    }
    pending = true;
    submit.disabled = true;
    cancel.disabled = true;
    input.readOnly = true;
    dialog.setAttribute("aria-busy", "true");
    try {
      await save(value);
      pending = false;
      close();
    } catch (cause) {
      error.textContent = cause instanceof Error ? cause.message : t("library.renameFailed");
    } finally {
      pending = false;
      submit.disabled = false;
      cancel.disabled = false;
      input.readOnly = false;
      dialog.removeAttribute("aria-busy");
    }
  });
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  let outsidePointer: number | null = null;
  const outside = (event: PointerEvent) => {
    const bounds = dialog.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  };
  dialog.addEventListener("pointerdown", (event) => {
    outsidePointer = event.button === 0 && outside(event) ? event.pointerId : null;
  });
  dialog.addEventListener("pointerup", (event) => {
    if (event.pointerId === outsidePointer && outside(event)) close();
    outsidePointer = null;
  });
  dialog.addEventListener("pointercancel", () => {
    outsidePointer = null;
  });
  sourceCard?.setAttribute("data-renaming", "true");
  dialog.showModal();
  disposeMotion = morphRename(dialog, form, sourceBounds);
  input.focus({ preventScroll: true });
  input.select();
}
