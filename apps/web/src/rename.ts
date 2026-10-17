import { acquireBackdrop } from "./action-backdrop.ts";
import { fadeMobileRename, closeMobileRename } from "./mobile-rename-motion.ts";
import { t } from "./locale.ts";
import { exitRename } from "./rename-exit.ts";
import { morphRename } from "./rename-motion.ts";
import { button, element } from "./dom.ts";
export function renameDrawing(
  name: string,
  save: (name: string) => void,
  restore: () => void,
  sourceBounds: DOMRect,
  sourceCard: HTMLElement | null,
  mobile = false,
): void {
  const backdrop = acquireBackdrop();
  const dialog = element("dialog", "rename-dialog");
  const form = element("form");
  const heading = element("h2", "", t("rename.title"));
  heading.id = "rename-heading";
  dialog.setAttribute("aria-labelledby", heading.id);
  const label = element("label", "", t("rename.label"));
  const input = element("input");
  input.value = name;
  input.maxLength = 240;
  input.required = true;
  label.append(input);
  const error = element("p", "error");
  error.setAttribute("role", "alert");
  const actions = element("div", "dialog-actions");
  let closed = false;
  let disposeMotion = () => {};
  const cardId = sourceCard?.dataset.id;
  const liveCard = () =>
    cardId ? document.querySelector<HTMLElement>(`[data-id="${CSS.escape(cardId)}"]`) : sourceCard;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.close(mobile ? 130 : 260);
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
    if (mobile) closeMobileRename(dialog, disposeMotion, done);
    else exitRename(dialog, form, trigger, disposeMotion, done);
  };
  const submit = element("button", "primary", t("action.rename"));
  submit.type = "submit";
  actions.append(button(t("action.cancel"), "", close), submit);
  form.append(heading, label, error, actions);
  dialog.append(form);
  document.body.append(dialog);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (closed) return;
    const value = input.value.trim();
    if (!value) {
      error.textContent = t("rename.required");
      return;
    }
    save(value);
    close();
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
  disposeMotion = mobile
    ? fadeMobileRename(dialog, sourceBounds)
    : morphRename(dialog, form, sourceBounds);
  input.focus({ preventScroll: true });
  input.select();
}
