import { element } from "../dom.ts";
import { t } from "../locale.ts";
import type { MessageId } from "../locale.ts";
import type { MetricKey, MetricSnapshot } from "./metrics.ts";
import * as css from "./presentation.css.ts";
const number = new Intl.NumberFormat(navigator.language, { maximumFractionDigits: 2 });
export const metricGroups: readonly (readonly MetricKey[])[] = [
  [
    "submitted",
    "validated",
    "pending",
    "inputP95",
    "inputMax",
    "inputCount",
    "inputWindow",
    "scheduling",
  ],
  ["queued", "active", "readyBytes", "hits", "misses", "upload"],
  ["gpuLive", "gpuAllocated", "cpu", "wasm"],
];
export function metricValue(value: number | undefined): string {
  return value === undefined ? t("diagnostics.unavailable") : number.format(value);
}
export function metricRow(label: MessageId): { node: HTMLElement; value: HTMLElement } {
  const node = element("div", css.row);
  const value = element("dd", css.value, t("diagnostics.unavailable"));
  node.append(element("dt", "", t(label)), value);
  return { node, value };
}
export function createMetricView(): {
  node: HTMLElement;
  update: (snapshot: MetricSnapshot) => void;
} {
  const node = element("div", css.group);
  const status = element("p", css.muted);
  const age = metricRow("diagnostics.age");
  const source = metricRow("diagnostics.state");
  const observation = element("dl", css.list);
  observation.append(age.node, source.node);
  node.append(status, observation, element("p", css.muted, t("diagnostics.window")));
  const fields = new Map<MetricKey, HTMLElement>();
  const headings = ["diagnostics.render", "diagnostics.worker", "diagnostics.memory"] as const;
  metricGroups.forEach((keys, i) => {
    const section = element("section", css.group);
    const list = element("dl", css.list);
    for (const key of keys) {
      const row = metricRow(`diagnostics.${key}`);
      fields.set(key, row.value);
      list.append(row.node);
    }
    section.append(element("h3", css.heading, t(headings[i] ?? "diagnostics.memory")), list);
    node.append(section);
  });
  return {
    node,
    update(snapshot) {
      age.value.textContent =
        snapshot.atMs > 0
          ? metricValue(Math.max(0, performance.now() - snapshot.atMs))
          : t("diagnostics.unavailable");
      status.textContent = snapshot.idle ? t("diagnostics.idle") : "";
      source.value.textContent = t(`diagnostics.${snapshot.source}`);
      for (const [key, field] of fields) field.textContent = metricValue(snapshot.values[key]);
    },
  };
}
