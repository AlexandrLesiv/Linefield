import { InputTraffic } from "./input-traffic";
/** Bounded lifecycle metadata only: no coordinates, pressure, artwork or per-sample logging. */
type Entry = {
  traffic?: ReturnType<InputTraffic["snapshot"]>;
  owner?: { id: number; type: string } | null;
  captured?: boolean;
  focused: boolean;
  visibility: DocumentVisibilityState;
  sequence: number;
  gesture: number;
  kind: string;
  time: number;
  pointerId?: number;
  pointerType?: string;
  buttons?: number;
  button?: number;
  eventTime?: number;
  trusted?: boolean;
  primary?: boolean;
  samples?: number;
  reason?: string;
};
export class InputDiagnostics {
  readonly traffic = new InputTraffic();
  private canvas: HTMLCanvasElement | null = null;
  private entries: Entry[] = [];
  private sequence = 0;
  private gesture = 0;
  private dropped = 0;
  private state: () => unknown = () => null;
  setState(read: () => unknown): void {
    this.state = read;
  }
  observeDocument(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    let lastMove = "";
    for (const kind of ["focusin", "focusout"] as const)
      document.addEventListener(
        kind,
        (event) =>
          this.note(
            `document-${kind}`,
            undefined,
            undefined,
            event.target === canvas ? "canvas" : "outside-canvas",
          ),
        true,
      );
    window.addEventListener("focus", () => this.note("window-focus"));
    window.addEventListener("blur", () => this.note("window-blur"));
    document.addEventListener("visibilitychange", () =>
      this.note("document-visibility", undefined, undefined, document.visibilityState),
    );
    for (const kind of [
      "pointerdown",
      "pointerup",
      "pointercancel",
      "gotpointercapture",
      "lostpointercapture",
      "pointermove",
    ] as const) {
      document.addEventListener(
        kind,
        (event) => {
          if (!["pen", "mouse"].includes(event.pointerType)) return;
          this.traffic.document(event);
          const target = event.target === canvas ? "canvas" : "outside-canvas";
          const transition = `${event.pointerId}:${event.pointerType}:${event.buttons}:${target}`;
          if (kind === "pointermove" && transition === lastMove) return;
          lastMove = kind === "pointermove" ? transition : "";
          this.note(`document-${kind}`, event, undefined, target);
        },
        true,
      );
    }
  }
  note(kind: string, event?: PointerEvent, samples?: number, reason?: string): void {
    if (kind === "begin" && event) {
      this.gesture++;
      this.traffic.begin(event);
    }
    if (kind === "pen-identity-transition" && event) this.traffic.adopt(event);
    const owner = this.traffic.identity;
    // Retain the episode before another begin resets its counters. Only existing
    // deduplicated lifecycle edges receive summaries, never every delivered move.
    const summarize =
      [
        "commit",
        "cancel",
        "capture-loss",
        "release-pending",
        "owner-contact-resumed",
        "pen-identity-transition",
      ].includes(kind) ||
      (kind === "document-pointermove" &&
        owner &&
        event &&
        (event.pointerId !== owner.id || event.pointerType !== owner.type));
    const traffic = summarize ? this.traffic.snapshot() : undefined;
    if (kind === "commit" || kind === "cancel") this.traffic.end();
    if (this.entries.length === 256) {
      this.entries.shift();
      this.dropped++;
    }
    this.entries.push({
      owner,
      ...(traffic ? { traffic } : {}),
      captured: owner ? this.canvas?.hasPointerCapture(owner.id) : false,
      focused: document.hasFocus(),
      visibility: document.visibilityState,
      sequence: ++this.sequence,
      gesture: this.gesture,
      kind,
      time: performance.now(),
      ...(event
        ? {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            buttons: event.buttons,
            button: event.button,
            eventTime: event.timeStamp,
            trusted: event.isTrusted,
            primary: event.isPrimary,
          }
        : {}),
      samples,
      reason,
    });
  }
  move(event: PointerEvent, reason: string | null): void {
    if (this.traffic.move(event, reason))
      this.note(reason ? "move-rejected" : "move-handled", event, undefined, reason ?? undefined);
  }
  snapshot() {
    return {
      format: "linefield-input-lifecycle-v1",
      build: new URL(import.meta.url).pathname.split("/").pop(),
      dropped: this.dropped,
      traffic: this.traffic.snapshot(),
      state: this.state(),
      entries: this.entries.map((entry) => ({ ...entry })),
    };
  }
  download(): void {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(this.snapshot(), null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "linefield-input-diagnostics.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
