/** One uncertain copy reader transfers here until retirement proves GPU completion. */
export class GpuReaderHold {
  private release: (() => void) | undefined;
  private resolve: (() => void) | undefined;
  hold(release: () => void) {
    if (this.release) throw Error("gpu-reader-capacity");
    this.release = release;
    return new Promise<void>((resolve) => {
      this.resolve = resolve;
    });
  }
  finish() {
    if (!this.release) return;
    this.release(); // Failed release remains owned and charged; never resolve uncertainty.
    this.release = undefined;
    this.resolve?.();
    this.resolve = undefined;
  }
}
