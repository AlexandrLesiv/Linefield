/** Bounded lifecycle metadata only: no coordinates, pressure, artwork or per-sample logging. */
type Entry = {
  sequence: number;
  gesture: number;
  kind: string;
  time: number;
  pointerId?: number;
  pointerType?: string;
  buttons?: number;
  eventTime?: number;
  trusted?: boolean;
  samples?: number;
  reason?: string;
};
export class InputDiagnostics {
  private entries: Entry[] = [];
  private sequence = 0;
  private gesture = 0;
  private dropped = 0;
  note(kind: string, event?: PointerEvent, samples?: number, reason?: string): void {
    if (kind === "begin") this.gesture++;
    if (this.entries.length === 256) {
      this.entries.shift();
      this.dropped++;
    }
    this.entries.push({
      sequence: ++this.sequence,
      gesture: this.gesture,
      kind,
      time: performance.now(),
      ...(event
        ? {
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            buttons: event.buttons,
            eventTime: event.timeStamp,
            trusted: event.isTrusted,
          }
        : {}),
      samples,
      reason,
    });
  }
  snapshot() {
    return {
      format: "linefield-input-lifecycle-v1",
      build: new URL(import.meta.url).pathname.split("/").pop(),
      dropped: this.dropped,
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
