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
import { observeStatus } from "../developer-diagnostics/runtime-port.ts";
export type Status =
  | "loading"
  | "ready"
  | "loadFailed"
  | "displayLost"
  | "resourceUnavailable"
  | "sizeUnavailable"
  | "fatal";
const messages = {
  loading: "memory.loading",
  ready: "memory.lifetime",
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
  canvas.setAttribute("aria-description", t("memory.lifetime"));
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
  const measure = () => {
    if (context) overlay.style.top = `${context.offsetTop + context.offsetHeight + 4}px`;
    if (footer) overlay.style.bottom = `${surface.clientHeight - footer.offsetTop + 4}px`;
  };
  const observer = new ResizeObserver(measure);
  for (const node of [surface, context, footer]) if (node) observer.observe(node);
  measure();
  return {
    canvas,
    status(status: Status) {
      observeStatus(status);
      canvas.dataset.state = status;
      canvas.setAttribute("aria-busy", String(status === "loading"));
      text.textContent = t(messages[status]);
      overlay.hidden = status === "ready";
      action.hidden = !["loadFailed", "displayLost", "resourceUnavailable"].includes(status);
      action.textContent = t(status === "loadFailed" ? "memory.retry" : "memory.retryDisplay");
    },
    dispose() {
      observer.disconnect();
      canvas.remove();
      overlay.remove();
    },
  };
}
export type MemoryView = ReturnType<typeof createMemoryView>;
