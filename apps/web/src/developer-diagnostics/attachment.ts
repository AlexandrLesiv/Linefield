import { DeveloperDiagnostics } from "./controller.ts";
import {
  diagnosticsStore,
  attachObserver,
  availability,
  observeVisibility,
} from "./runtime-port.ts";
import { observeMetrics } from "./runtime-metrics.ts";
import { DeferredNotification } from "./deferred.ts";
import { button, element } from "../dom.ts";
import { t } from "../locale.ts";
import { bindPanelDismissal } from "./dismissal.ts";
import * as css from "./presentation.css.ts";
export function attachDiagnostics(surface: HTMLElement, canvas: HTMLCanvasElement): () => void {
  const settings = surface.querySelector<HTMLButtonElement>("[data-drawing-settings]");
  if (!settings) return () => {};
  const menu = element("section", css.panel);
  menu.hidden = true;
  menu.role = "dialog";
  menu.setAttribute("aria-label", t("diagnostics.settings"));
  const title = element("h2", css.title, t("diagnostics.settings"));
  title.tabIndex = -1;
  const close = (restore: boolean) => {
    menu.hidden = true;
    settings.setAttribute("aria-expanded", "false");
    if (restore && settings.isConnected) settings.focus({ preventScroll: true });
  };
  const entry = button(t("diagnostics.title"), css.action, () => {
    if (diagnostics.open()) menu.hidden = true;
  });
  const showSettings = () => {
    if (!availability().idle || !availability().visible) return;
    menu.hidden = false;
    settings.setAttribute("aria-expanded", "true");
    entry.focus({ preventScroll: true });
  };
  menu.append(
    title,
    button(t("diagnostics.close"), css.action, () => close(true)),
    entry,
  );
  surface.append(menu);
  const diagnostics = new DeveloperDiagnostics(
    {
      mount: surface,
      focusCanvas: () => canvas.focus({ preventScroll: true }),
      closeSettings: close,
      backToSettings: showSettings,
      observeMetrics: (wanted) =>
        observeMetrics(
          wanted,
          (value) => diagnostics.offerMetrics(value),
          () => diagnosticsStore.sinkFailure(),
        ),
    },
    diagnosticsStore,
  );
  const presentation = new DeferredNotification();
  const detach = attachObserver((value) => {
    diagnostics.setAvailability(value);
    presentation.schedule(() => {
      const current = availability();
      settings.setAttribute("aria-disabled", String(!current.idle || !current.visible));
      if (!current.visible) close(false);
    });
  });
  const open = () => {
    if (!availability().idle || !availability().visible) return;
    if (!menu.hidden) close(true);
    else showSettings();
  };
  settings.disabled = false;
  settings.title = t("diagnostics.settings");
  settings.setAttribute("aria-label", t("diagnostics.settings"));
  settings.setAttribute("aria-haspopup", "dialog");
  settings.addEventListener("click", open);
  const dismiss = bindPanelDismissal(menu, () => !menu.hidden, close);
  const visibility = () => observeVisibility(!document.hidden);
  document.addEventListener("visibilitychange", visibility);
  const context = surface.querySelector<HTMLElement>(".drawing-context");
  const footer = surface.querySelector<HTMLElement>(".canvas-footer");
  const rail = surface.querySelector<HTMLElement>(".drawing-rail");
  const measure = () => {
    const bottom = footer ? surface.clientHeight - footer.offsetTop : 0;
    const top = context ? context.offsetTop + context.offsetHeight : 0;
    diagnostics.setFreeSpace(
      surface.clientWidth - (rail?.offsetWidth ?? 0),
      surface.clientHeight - top - bottom,
      bottom,
    );
  };
  const resize = new ResizeObserver(measure);
  for (const node of [surface, context, footer, rail]) if (node) resize.observe(node);
  measure();
  return () => {
    diagnostics.acceptedDeparture();
    detach();
    observeMetrics(false);
    presentation.cancel();
    diagnostics.dispose();
    dismiss();
    resize.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    settings.removeEventListener("click", open);
    menu.remove();
  };
}
