/** Browser sample acquisition. Rust still owns coordinate mapping, validation,
 * stroke geometry and history; this adapter never retains document samples.
 */
export class PointerSamples {
  private lastX = 0;
  private lastY = 0;
  private lastPressure = 1;
  constructor(
    private canvas: HTMLCanvasElement,
    private append: (x: number, y: number, pressure: number) => void,
    private showPressure: (pressure: number | null) => void,
  ) {}
  sample(event: PointerEvent, bounds = this.canvas.getBoundingClientRect()): void {
    const pressure = event.pointerType === "pen" ? event.pressure : 1;
    this.append(event.clientX - bounds.left, event.clientY - bounds.top, pressure);
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.lastPressure = pressure;
    this.showPressure(event.pointerType === "pen" ? event.pressure : null);
  }
  move(event: PointerEvent): void {
    const samples = event.getCoalescedEvents?.();
    if (samples?.length) {
      // The synchronous batch cannot change layout: append/pressure only update state.
      // Read again for every dispatched event; never cache across layout/scroll changes.
      const bounds = this.canvas.getBoundingClientRect();
      for (const sample of samples) this.sample(sample, bounds);
    } else this.sample(event);
  }
  release(event: PointerEvent): void {
    // A release may carry a final changed position but zero contact pressure.
    // Keep the donor's last-contact-pressure behavior without adding duplicates.
    if (event.clientX === this.lastX && event.clientY === this.lastY) return;
    const bounds = this.canvas.getBoundingClientRect();
    this.append(event.clientX - bounds.left, event.clientY - bounds.top, this.lastPressure);
  }
  endedContact(event: PointerEvent, matches: (sample: PointerEvent) => boolean): void {
    const bounds = this.canvas.getBoundingClientRect();
    for (const sample of event.getCoalescedEvents?.() ?? []) {
      if (matches(sample) && (sample.buttons & 1) !== 0 && sample.timeStamp <= event.timeStamp)
        this.sample(sample, bounds);
    }
  }
}
