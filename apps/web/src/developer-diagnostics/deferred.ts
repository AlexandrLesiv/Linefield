/** One bounded host-task notification; input callbacks never perform diagnostic DOM work. */
export class DeferredNotification {
  #timer: ReturnType<typeof setTimeout> | undefined;
  schedule(action: () => void): void {
    if (this.#timer !== undefined) return;
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      action();
    }, 0);
  }
  cancel(): void {
    clearTimeout(this.#timer);
    this.#timer = undefined;
  }
}
