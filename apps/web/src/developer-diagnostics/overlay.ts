import { element } from "../dom.ts";
import { t } from "../locale.ts";
import { metricValue } from "./metric-view.ts";
import type { MetricKey, MetricSnapshot } from "./metrics.ts";
import * as css from "./presentation.css.ts";
const rows = [
  ["submitted", "validated"],
  ["pending", "inputPercentile", "inputMax"],
  ["queued", "active", "readyBytes", "gpuLive", "gpuAllocated"],
  ["hits", "misses", "upload"],
] as const satisfies readonly (readonly MetricKey[])[];
export function createOverlay() {
  const node = element("aside", css.overlay);
  node.hidden = true;
  node.setAttribute("aria-hidden", "true");
  const fields = rows.map(() => element("p", css.overlayRow));
  node.append(...fields);
  let width = 0;
  let height = 0;
  let fits = false;
  let previous: MetricSnapshot | undefined;
  let previousCapture = false;
  const measure = () => {
    const hidden = node.hidden;
    node.hidden = false;
    fits = width >= 160 && height >= node.scrollHeight + 16;
    node.hidden = hidden;
  };
  return {
    node,
    get fits(): boolean {
      return fits;
    },
    update(snapshot: MetricSnapshot, capturing: boolean) {
      if (previous === snapshot && previousCapture === capturing) return;
      previous = snapshot;
      previousCapture = capturing;
      rows.forEach((keys, index) => {
        const row = fields[index];
        if (!row) return;
        const values = keys.map(
          (key) => `${t(`diagnostics.${key}`)}: ${metricValue(snapshot.values[key])}`,
        );
        if (index === 0)
          values.push(
            t("diagnostics.window"),
            `${t("diagnostics.age")}: ${snapshot.atMs > 0 ? metricValue(Math.max(0, performance.now() - snapshot.atMs)) : t("diagnostics.unavailable")}`,
          );
        if (index === 3)
          values.push(
            t(
              capturing
                ? "diagnostics.capturing"
                : snapshot.idle
                  ? "diagnostics.idle"
                  : `diagnostics.${snapshot.source}`,
            ),
            `${t("diagnostics.state")}: ${t(`diagnostics.${snapshot.source}`)}`,
          );
        row.textContent = values.join(" · ");
      });
      measure();
    },
    setSpace(availableWidth: number, availableHeight: number, footerInset: number): void {
      node.style.insetBlockEnd = `${Number.isFinite(footerInset) ? Math.max(0, footerInset) + 8 : 8}px`;
      // Host supplies free space above the complete footer, excluding interactive chrome.
      width = Number.isFinite(availableWidth) ? availableWidth : 0;
      height = Number.isFinite(availableHeight) ? availableHeight : 0;
      node.style.maxWidth = `min(22rem, ${Math.max(0, width - 16)}px)`;
      measure();
    },
  };
}
