import { button, element } from "../dom.ts";
import { t } from "../locale.ts";
import type { StopReason } from "./capture.ts";
import type { DiagnosticState } from "./store.ts";
import type { ExportState } from "./export.ts";
import type { BuildIdentity } from "./schema.ts";
import { createMetricView, metricRow, metricValue } from "./metric-view.ts";
import * as css from "./presentation.css.ts";
export interface PanelActions {
  back(): void;
  close(): void;
  start(): void;
  stop(): void;
  download(): void;
  clear(): void;
  pin(value: boolean): void;
}
const reasons = {
  manual: "diagnostics.reasonManual",
  duration: "diagnostics.reasonDuration",
  events: "diagnostics.reasonEvents",
  bytes: "diagnostics.reasonBytes",
  hidden: "diagnostics.reasonHidden",
  departure: "diagnostics.reasonDeparture",
  invalid: "diagnostics.reasonInvalid",
  sink: "diagnostics.reasonSink",
  terminal: "diagnostics.reasonTerminal",
} as const satisfies Record<StopReason, string>;
export function createPanel(actions: PanelActions, build: BuildIdentity) {
  const node = element("section", css.panel);
  node.hidden = true;
  node.role = "dialog";
  node.setAttribute("aria-label", t("diagnostics.title"));
  const title = element("h2", css.title, t("diagnostics.title"));
  title.tabIndex = -1;
  const navigation = element("div", css.actions);
  navigation.append(
    button(t("diagnostics.back"), css.action, actions.back),
    button(t("diagnostics.close"), css.action, actions.close),
  );
  const capture = element("div", css.group);
  const status = element("p", css.copy);
  const reason = element("p", css.copy);
  const start = button(t("diagnostics.capture"), css.action, actions.start);
  // The same element becomes Download after Stop, preserving keyboard focus.
  const finish = button(t("diagnostics.stop"), css.action, () =>
    currentCapturing ? actions.stop() : actions.download(),
  );
  const clear = button(t("diagnostics.clear"), css.action, actions.clear);
  const controls = element("div", css.actions);
  controls.append(start, finish, clear);
  capture.append(status, reason, controls, element("p", css.muted, t("diagnostics.retention")));
  const pinLabel = element("label", css.pin);
  const pin = element("input");
  pin.type = "checkbox";
  pin.addEventListener("change", () => actions.pin(pin.checked));
  pinLabel.append(pin, element("span", "", t("diagnostics.pin")));
  const suppressed = element("p", css.muted, t("diagnostics.hidden"));
  suppressed.hidden = true;
  const metrics = createMetricView();
  const integrity = element("section", css.group);
  const list = element("dl", css.list);
  const fields = new Map<string, HTMLElement>();
  for (const key of [
    "baseline",
    "overwritten",
    "dropped",
    "failures",
    "appBuild",
    "engineBuild",
    "preparationBuild",
  ] as const) {
    const row = metricRow(`diagnostics.${key}`);
    fields.set(key, row.value);
    list.append(row.node);
  }
  fields.get("appBuild")?.replaceChildren(document.createTextNode(build.app));
  fields.get("engineBuild")?.replaceChildren(document.createTextNode(build.engine));
  fields.get("preparationBuild")?.replaceChildren(document.createTextNode(build.preparation));
  integrity.append(element("h3", css.heading, t("diagnostics.integrity")), list);
  const announcement = element("p", css.announcement);
  announcement.setAttribute("aria-live", "polite");
  node.append(
    title,
    navigation,
    element("p", css.muted, t("diagnostics.disclosure")),
    capture,
    pinLabel,
    suppressed,
    metrics.node,
    integrity,
  );
  let currentCapturing = false;
  return {
    node,
    announcement,
    title,
    metrics,
    announce(message: string) {
      announcement.textContent = message;
    },
    update(
      state: DiagnosticState,
      idle: boolean,
      canCapture: boolean,
      exporting: ExportState,
      pinned: boolean,
      hidden: boolean,
    ) {
      currentCapturing = state.capturing;
      start.textContent = t(state.report ? "diagnostics.newCapture" : "diagnostics.capture");
      const preparing = exporting === "preparing";
      start.disabled = !idle || !canCapture || state.capturing || preparing;
      finish.textContent = t(state.capturing ? "diagnostics.stop" : "diagnostics.download");
      finish.disabled = !idle || preparing || (!state.capturing && !state.report);
      clear.disabled = !idle || state.capturing || preparing || !state.report;
      pin.checked = pinned;
      suppressed.hidden = !hidden;
      const statusId = state.capturing
        ? "diagnostics.capturing"
        : exporting === "preparing"
          ? "diagnostics.preparing"
          : exporting === "failed"
            ? "diagnostics.exportFailed"
            : exporting === "requested"
              ? "diagnostics.requested"
              : exporting === "ready"
                ? "diagnostics.readyDownload"
                : state.report
                  ? state.report.partial
                    ? "diagnostics.partial"
                    : "diagnostics.ready"
                  : "diagnostics.empty";
      status.textContent = t(statusId);
      status.className = exporting === "failed" ? css.error : css.copy;
      reason.textContent = state.report ? t(reasons[state.report.reason]) : "";
      for (const [key, value] of Object.entries({
        baseline: state.baselineEvents,
        overwritten: state.overwritten,
        dropped: state.dropped,
        failures: state.sinkFailures,
      })) {
        const field = fields.get(key);
        if (field) field.textContent = metricValue(value);
      }
    },
  };
}
