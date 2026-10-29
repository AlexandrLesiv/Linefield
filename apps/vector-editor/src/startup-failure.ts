import { t } from "../../web/src/locale";

/** Only used before the owning engine has been exposed to input. Never reload
 * an established drawing session to recover a rendering/resource failure. */
export function showStartupFailure(status: HTMLElement): void {
  const message = document.createElement("span");
  message.textContent = t("memory.loadFailed") + " ";
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = t("memory.retry");
  retry.addEventListener("click", () => location.reload());
  status.replaceChildren(message, retry);
}
