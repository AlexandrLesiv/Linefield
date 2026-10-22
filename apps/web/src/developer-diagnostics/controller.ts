import { t } from "../locale.ts";
import { DiagnosticsStore } from "./store.ts";
import { DiagnosticExport } from "./export.ts";
import { MetricUpdates } from "./metrics.ts";
import type { MetricSnapshot } from "./metrics.ts";
import { createPanel } from "./panel.ts";
import { createOverlay } from "./overlay.ts";
import type { DiagnosticAvailability, DiagnosticHost } from "./host.ts";
import { canCapture, sameAvailability } from "./host.ts";
import { bindPanelDismissal } from "./dismissal.ts";
const emptyMetrics: MetricSnapshot = { atMs: 0, idle: true, source: "unavailable", values: {} };
/** Presentation adapter only. The host supplies cached availability; no engine queries here. */
export class DeveloperDiagnostics {
  readonly #host: DiagnosticHost;
  readonly #store: DiagnosticsStore;
  readonly #export = new DiagnosticExport();
  readonly #panel;
  readonly #overlay = createOverlay();
  readonly #metrics: MetricUpdates;
  readonly #unsubscribe: () => void;
  readonly #unbind: () => void;
  #availability: DiagnosticAvailability = {
    idle: false,
    ready: false,
    visible: false,
    terminal: false,
    interactionEpoch: 0,
  };
  #open = false;
  #observing = false;
  #snapshot = emptyMetrics;
  #disposed = false;
  constructor(host: DiagnosticHost, store: DiagnosticsStore) {
    this.#host = host;
    this.#store = store;
    this.#panel = createPanel(
      {
        back: () => {
          this.close(false);
          host.backToSettings();
        },
        close: () => this.close(true),
        start: () => this.#start(),
        stop: () => {
          if (this.#canAct()) {
            store.stop("manual");
            this.#panel.announce(t("diagnostics.ready"));
          }
        },
        download: () => {
          void this.#download();
        },
        clear: () => {
          if (this.#canAct() && !store.capturing && this.#export.state !== "preparing") {
            this.#export.clear();
            store.clear();
          }
        },
        pin: (value) => {
          store.pinned = value;
          this.#refresh();
        },
      },
      store.build,
    );
    this.#metrics = new MetricUpdates((snapshot) => {
      if (this.#disposed || (!this.#observing && !this.#open)) return;
      this.#snapshot = snapshot;
      this.#panel.metrics.update(snapshot);
      this.#overlay.update(snapshot, store.capturing);
      this.#refresh();
    });
    this.#unsubscribe = store.subscribe(() => {
      this.#refresh();
      if (store.report?.reason === "sink" || store.report?.reason === "invalid")
        this.#panel.announce(t("diagnostics.partial"));
    });
    this.#unbind = bindPanelDismissal(
      this.#panel.node,
      () => this.#open,
      (restore) => this.close(restore),
    );
    host.mount.append(this.#overlay.node, this.#panel.node, this.#panel.announcement);
    this.#refresh();
  }
  open(): boolean {
    if (!this.#canAct()) return false;
    this.#open = true;
    this.#metrics.offer(this.#snapshot);
    this.#refresh();
    this.#panel.title.focus();
    return true;
  }
  close(restoreFocus: boolean): void {
    this.#open = false;
    this.#refresh();
    this.#host.closeSettings(restoreFocus);
  }
  setAvailability(value: DiagnosticAvailability): void {
    if (sameAvailability(this.#availability, value)) return;
    const terminal = value.terminal && !this.#availability.terminal;
    this.#availability = { ...value };
    if (!value.visible) {
      this.#export.clear();
      this.#store.stop("hidden");
      this.#open = false;
    }
    if (terminal) {
      this.#snapshot = { ...this.#snapshot, idle: true, source: "unavailable" };
      this.#export.clear();
      this.#store.stop("terminal");
    }
    this.#refresh();
    if (terminal) this.#metrics.offer(this.#snapshot);
  }
  acceptedDeparture(): void {
    this.#store.stop("departure");
    this.setAvailability({ ...this.#availability, visible: false });
  }
  offerMetrics(snapshot: MetricSnapshot): void {
    if (this.#observing) this.#metrics.offer(snapshot);
  }
  setFreeSpace(width: number, height: number, footerInset: number): void {
    this.#overlay.setSpace(width, height, footerInset);
    this.#refresh();
  }
  dispose(): void {
    this.acceptedDeparture();
    this.#disposed = true;
    this.#unsubscribe();
    this.#export.clear();
    this.#metrics.stop();
    this.#unbind();
    this.#panel.node.remove();
    this.#panel.announcement.remove();
    this.#overlay.node.remove();
  }
  #canAct(): boolean {
    return !this.#disposed && this.#availability.idle && this.#availability.visible;
  }
  #start(): void {
    if (!this.#canAct() || !canCapture(this.#availability) || this.#export.state === "preparing")
      return;
    if (!this.#store.start()) {
      this.#panel.announce(t("diagnostics.captureFailed"));
      return;
    }
    this.#export.clear();
    this.#panel.announce(t("diagnostics.capturing"));
    this.close(false);
    this.#host.focusCanvas();
  }
  async #download(): Promise<void> {
    const report = this.#store.report;
    if (!this.#canAct() || !report || this.#store.capturing || this.#export.state === "preparing")
      return;
    if (this.#export.state === "ready" || this.#export.state === "requested") {
      this.#export.download(this.#canAct());
    } else {
      const epoch = this.#availability.interactionEpoch;
      const promise = this.#export.prepare(report);
      this.#refresh();
      if (
        (await promise) &&
        this.#canAct() &&
        this.#availability.interactionEpoch === epoch &&
        navigator.userActivation.isActive
      )
        this.#export.download(true);
    }
    if (!this.#disposed) {
      this.#refresh();
      if (this.#export.state === "failed") this.#panel.announce(t("diagnostics.exportFailed"));
    }
  }
  #refresh(): void {
    if (this.#disposed) return;
    this.#panel.node.hidden = !this.#open;
    this.#overlay.update(this.#snapshot, this.#store.capturing);
    const fits = !this.#store.pinned || this.#overlay.fits;
    this.#overlay.node.hidden = !this.#store.pinned || !fits || !this.#availability.visible;
    this.#panel.update(
      this.#store.state(),
      this.#canAct(),
      canCapture(this.#availability),
      this.#export.state,
      this.#store.pinned,
      this.#store.pinned && !fits,
    );
    const observing =
      this.#availability.visible &&
      !this.#availability.terminal &&
      (this.#open || this.#store.pinned || this.#store.capturing);
    if (observing !== this.#observing) {
      this.#observing = observing;
      if (!observing) this.#metrics.stop();
      this.#host.observeMetrics(observing);
    }
  }
}
