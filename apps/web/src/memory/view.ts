import { element, button } from "../dom.ts";
import { t } from "../locale.ts";
import type { MessageId } from "../locale.ts";
import {
  statusText,
  canvas as canvasStyle,
  overlay as overlayStyle,
  message as messageStyle,
  retry as retryStyle,
} from "./view.css.ts";
import { back } from "../canvas.css.ts";
import type { ReplyValue } from "./bridge.ts";
export type Status =
  | "loading"
  | "ready"
  | "updating"
  | "loadFailed"
  | "displayLost"
  | "resourceUnavailable"
  | "sizeUnavailable"
  | "fatal";
const messages = {
  loading: "memory.loading",
  ready: "memory.foundation",
  updating: "memory.foundation",
  loadFailed: "memory.loadFailed",
  displayLost: "memory.displayLost",
  resourceUnavailable: "memory.resourceUnavailable",
  sizeUnavailable: "memory.sizeUnavailable",
  fatal: "memory.fatal",
} as const satisfies Record<Status, MessageId>;
export function createMemoryView(surface: HTMLElement, retry: () => void) {
  const canvas = element("canvas", canvasStyle);
  canvas.dataset.memoryCanvas = "";
  canvas.tabIndex = 0;
  canvas.setAttribute("role", "region");
  canvas.setAttribute("aria-label", t("memory.canvas"));
  canvas.setAttribute("aria-description", t("memory.foundation"));
  const overlay = element("div", overlayStyle);
  const message = element("div", messageStyle);
  const text = element("p", statusText);
  text.id = "memory-status";
  text.tabIndex = 0;
  text.setAttribute("role", "status");
  canvas.setAttribute("aria-describedby", "memory-status memory-disclosure");
  const action = button(t("memory.retry"), `${back} ${retryStyle}`, retry);
  action.hidden = true;
  message.append(text, action);
  overlay.append(message);
  surface.prepend(canvas);
  surface.append(overlay);
  const context = surface.querySelector<HTMLElement>(".drawing-context");
  const footer = surface.querySelector<HTMLElement>(".canvas-footer");
  const inputNotice = element("span", statusText);
  inputNotice.dataset.memoryInputFailure = "";
  inputNotice.setAttribute("role", "status");
  inputNotice.hidden = true;
  surface.querySelector(".canvas-notice")?.append(inputNotice);
  const pendingNotice = element("span", statusText);
  pendingNotice.dataset.memoryPendingRelease = "";
  pendingNotice.setAttribute("role", "status");
  pendingNotice.textContent = t("memory.pendingRelease") + " ";
  pendingNotice.hidden = true;
  surface.querySelector(".canvas-notice")?.prepend(pendingNotice);
  const measure = () => {
    if (context) overlay.style.top = `${context.offsetTop + context.offsetHeight + 4}px`;
    if (footer) overlay.style.bottom = `${surface.clientHeight - footer.offsetTop + 4}px`;
  };
  const observer = new ResizeObserver(measure);
  for (const node of [surface, context, footer]) if (node) observer.observe(node);
  measure();
  return {
    canvas,
    surface,
    pendingRelease(active: boolean) {
      pendingNotice.hidden = !active;
      if (active && pendingNotice.parentElement) pendingNotice.parentElement.scrollTop = 0;
    },
    command(previous: ReplyValue, next: ReplyValue) {
      if (previous.content !== next.content || previous.mapping !== next.mapping)
        this.status("updating");
      if (previous.interaction === 0n && next.interaction !== 0n) inputNotice.hidden = true;
      if (next.activeCancelled && next.code !== "ok") {
        inputNotice.textContent =
          " " + t(next.code === "capacity" ? "memory.inputCapacity" : "memory.inputInvalid");
        inputNotice.hidden = false;
      } else if (next.code === "unavailable" && previous.interaction === 0n) {
        inputNotice.textContent = " " + t("memory.inputBusy");
        inputNotice.hidden = false;
      }
    },
    status(status: Status) {
      canvas.dataset.state = status;
      canvas.setAttribute("aria-busy", String(status === "loading" || status === "updating"));
      text.textContent = t(messages[status]);
      overlay.hidden = status === "ready" || status === "updating";
      action.hidden = !["loadFailed", "displayLost", "resourceUnavailable"].includes(status);
      action.textContent = t(status === "loadFailed" ? "memory.retry" : "memory.retryDisplay");
    },
    dispose() {
      observer.disconnect();
      canvas.remove();
      overlay.remove();
      inputNotice.remove();
      pendingNotice.remove();
    },
  };
}
export type MemoryView = ReturnType<typeof createMemoryView>;
