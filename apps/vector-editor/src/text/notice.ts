import { t } from "../../../web/src/locale";
export function textNotice(retry: () => void, note: (kind: string) => void) {
  const button = document.createElement("button");
  button.id = "text-render-notice";
  button.hidden = true;
  document.querySelector("header")!.append(button);
  let previous = "";
  button.onclick = () => {
    note("text-render-retry");
    retry();
  };
  return {
    update(pending: boolean, error: string) {
      if (error !== previous) {
        if (error) note("text-render-failure");
        else if (previous) note("text-render-recovered");
        previous = error;
      }
      button.hidden = !pending && !error;
      button.disabled = !error;
      button.textContent = t(error ? "text.renderFailed" : "text.preparing");
    },
  };
}
