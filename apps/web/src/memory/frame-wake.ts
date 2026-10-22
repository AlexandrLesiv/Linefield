// One producer subscription and one admission subscription; no accumulated races.
export class FrameWake {
  private waiters = new Set<() => void>();
  private timers = 0;
  peakWaiters = 0;
  peakTimers = 0;
  get subscriptions() {
    return this.waiters.size;
  }
  get timerCount() {
    return this.timers;
  }
  signal() {
    for (const resolve of this.waiters) resolve();
  }
  wait(milliseconds?: number) {
    if (milliseconds !== undefined && this.timers) throw Error("frame-timers");
    if (this.waiters.size >= 2) throw Error("frame-waiters");
    return new Promise<void>((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = () => {
        if (!this.waiters.delete(finish)) return;
        if (timer !== undefined) {
          clearTimeout(timer);
          this.timers--;
        }
        resolve();
      };
      this.waiters.add(finish);
      this.peakWaiters = Math.max(this.peakWaiters, this.waiters.size);
      if (milliseconds !== undefined) {
        this.timers++;
        this.peakTimers = Math.max(this.peakTimers, this.timers);
        timer = setTimeout(finish, Math.max(0, milliseconds));
      }
    });
  }
}
