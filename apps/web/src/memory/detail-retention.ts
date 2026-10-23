import type { ReplyValue, MappingValue } from "./bridge.ts";
import { append } from "./performance-observation.ts";
// Observe accepted commands before a GPU slot or render can delay their quiet deadline.
export class DetailRetention {
  private mapping: bigint | undefined;
  private value = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private generation = 0;
  private changed: () => void;
  constructor(changed: () => void) {
    this.changed = changed;
  }
  get current() {
    return this.value;
  }
  accept(state: ReplyValue, read: () => MappingValue) {
    if (state.mapping === this.mapping) return;
    const mapping = read();
    if (mapping.code !== "ok" || !mapping.available) return;
    const requested = 2 ** Math.ceil(Math.log2(mapping.zoom * mapping.backing));
    this.mapping = state.mapping;
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    if (requested >= this.value) this.value = requested;
    else {
      const generation = this.generation;
      this.timer = setTimeout(() => {
        if (generation !== this.generation) return;
        this.timer = undefined;
        this.value = requested;
        this.observe(state, "settled", requested);
        this.changed();
      }, 250);
    }
    this.observe(state, "accepted", requested);
  }
  private observe(state: ReplyValue, phase: string, minimum: number) {
    if (import.meta.env.MODE === "performance-e2e")
      append({
        kind: "retention-detail",
        mapping: String(state.mapping),
        phase,
        minimum,
        retained: this.value,
        time: performance.now(),
      });
  }
  reset() {
    this.generation++;
    if (this.timer) clearTimeout(this.timer);
    this.timer = undefined;
    this.mapping = undefined;
    this.value = 0;
  }
}
