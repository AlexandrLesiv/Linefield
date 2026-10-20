import type { Unit } from "./protocol.ts";
export class Measure {
  units: Unit[] = [];
  stage = "initialization";
  busyPeriods: number[] = [];
  private busyStart = performance.now();
  beginBusy() {
    this.busyStart = performance.now();
  }
  endBusy() {
    this.busyPeriods.push(performance.now() - this.busyStart);
  }
  readonly guarded: boolean;
  readonly progress: (stage: string, units: Unit[]) => void;
  constructor(guarded: boolean, progress: (stage: string, units: Unit[]) => void) {
    this.guarded = guarded;
    this.progress = progress;
  }
  enter(stage: string) {
    this.stage = stage;
    this.progress(stage, this.units);
  }
  record(stage: string, ms: number) {
    this.units.push({ stage, ms });
    if (this.guarded && ms > 8) throw Error(`operation-guard:${stage}`);
  }
  run<T>(stage: string, action: () => T, dispose?: (value: T) => void): T {
    this.enter(stage);
    const start = performance.now();
    const value = action();
    try {
      this.record(stage, performance.now() - start);
    } catch (error) {
      dispose?.(value);
      throw error;
    }
    return value;
  }
}
