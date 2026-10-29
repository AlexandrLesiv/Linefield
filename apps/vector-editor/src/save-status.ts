import { t } from "../../web/src/locale";

/** Status has a stable box and never changes the canvas cursor or render lifecycle. */
export function createSaveStatus() {
  const root = document.querySelector<HTMLElement>(".notice")!;
  root.classList.add("save-status");
  const text = document.createElement("span"),
    action = document.createElement("button"),
    stay = document.createElement("button"),
    announcement = document.createElement("span");
  text.id = "save-state";
  action.type = stay.type = "button";
  action.id = "save-action";
  stay.id = "save-stay";
  stay.textContent = t("save.cancelLeave");
  stay.hidden = true;
  announcement.setAttribute("role", "status");
  announcement.className = "save-announcement";
  root.replaceChildren(text, action, stay, announcement);
  const style = document.createElement("style");
  style.textContent = `.save-status{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-template-rows:3em 2.5em;align-items:center;gap:4px;width:100%;height:6em;margin:0;color:var(--editor-text)}
    .save-status #save-state{grid-column:1/-1;max-height:3em;overflow:auto}.save-status button{font:inherit;padding:4px 8px}
    .save-status [hidden]{display:block;visibility:hidden;pointer-events:none}.save-announcement{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}`;
  document.head.append(style);
  let handler = () => {},
    cancel = () => {},
    previous = "";
  action.onclick = () => handler();
  stay.onclick = () => cancel();
  return {
    set(
      state:
        | "loading"
        | "saved"
        | "pending"
        | "saving"
        | "failed"
        | "openFailed"
        | "openInUse"
        | "capacity"
        | "leaving"
        | "waitStroke",
      run: () => void = () => {},
      onCancel?: () => void,
    ) {
      if (state === previous) return;
      text.textContent = t(`save.${state}`);
      root.dataset.saveState = state;
      action.hidden = ["loading", "leaving", "waitStroke"].includes(state);
      action.textContent = t(
        state === "openFailed" || state === "openInUse"
          ? "save.retryOpen"
          : state === "failed" || state === "capacity"
            ? "save.retry"
            : "save.now",
      );
      handler = run;
      stay.hidden = !onCancel;
      cancel = onCancel ?? (() => {});
      if (state !== previous && ["failed", "openFailed", "openInUse", "capacity"].includes(state))
        announcement.textContent = text.textContent;
      previous = state;
    },
    announceSaved() {
      announcement.textContent = t("save.saved");
    },
  };
}
