export type Demand = { bytes: number; pages: number; tickets: number };
export type ResidencyToken = Demand & { sequence: number; cutoff: number };
export type IdleBudget = { remaining: number; deadline: number };
export function transition(budget: IdleBudget) {
  if (budget.remaining <= 0 || performance.now() >= budget.deadline) return false;
  budget.remaining--;
  return true;
}
// One identity-fenced token, credit and task per exact resource owner; no pass archive.
export class Residency {
  active: ResidencyToken | undefined;
  enabled = true;
  private sequence = 0;
  private admission = 0;
  private credit: ResidencyToken | undefined;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private failed: (error: unknown) => void;
  private step: (credit: ResidencyToken | undefined, budget: IdleBudget) => boolean;
  constructor(
    step: (credit: ResidencyToken | undefined, budget: IdleBudget) => boolean,
    failed: (error: unknown) => void = (error) => {
      throw error;
    },
  ) {
    this.step = step;
    this.failed = failed;
  }
  open() {
    if (this.active || this.stopped) throw Error("residency-busy");
    this.credit = undefined;
    this.cancelTask();
    if (this.sequence === Number.MAX_SAFE_INTEGER) this.enabled = false;
    else this.sequence++;
    const token = {
      sequence: this.sequence,
      cutoff: this.admission,
      bytes: 0,
      pages: 0,
      tickets: 0,
    };
    this.active = token;
    return token;
  }
  admit() {
    if (this.admission === Number.MAX_SAFE_INTEGER) this.enabled = false;
    else this.admission++;
    return this.admission;
  }
  refuse(bytes: number, pages: number, tickets: number, byteLimit: number) {
    const token = this.active;
    if (!token || !this.enabled || this.stopped) return;
    token.bytes = Math.min(byteLimit, token.bytes + bytes);
    token.pages = Math.min(128, token.pages + pages);
    token.tickets = Math.min(8, token.tickets + tickets);
  }
  close(token: ResidencyToken, accepted: boolean) {
    if (this.active !== token) return;
    this.active = undefined;
    if (!this.stopped && accepted && this.enabled) this.credit = token;
    this.resume();
  }
  resume() {
    if (this.timer || this.stopped) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.stopped) return;
      try {
        if (
          this.step(this.active ? undefined : this.credit, {
            remaining: 128,
            deadline: performance.now() + 2,
          })
        )
          this.resume();
        else this.credit = undefined;
      } catch (error) {
        this.stop();
        this.failed(error);
      }
    }, 0);
  }
  private cancelTask() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
  }
  stop() {
    this.stopped = true;
    this.enabled = false;
    this.credit = undefined;
    this.cancelTask();
  }
}
