import type { SafeRecord } from "./schema.ts";
export class BaselineRing {
  readonly #records: (SafeRecord | undefined)[] = Array.from({ length: 1024 });
  #head = 0;
  #size = 0;
  #bytes = 0;
  overwritten = 0;
  push(record: SafeRecord): void {
    while (this.#size && (this.#size === 1024 || this.#bytes + record.bytes + 1 > 1_048_576)) {
      this.#bytes -= (this.#records[this.#head]?.bytes ?? 0) + 1;
      this.#records[this.#head] = undefined;
      this.#head = (this.#head + 1) % 1024;
      this.#size--;
      this.overwritten = Math.min(Number.MAX_SAFE_INTEGER, this.overwritten + 1);
    }
    this.#records[(this.#head + this.#size) % 1024] = record;
    this.#size++;
    this.#bytes += record.bytes + 1;
  }
  snapshot(): SafeRecord[] {
    const records: SafeRecord[] = [];
    for (let i = 0; i < this.#size; i++) {
      const record = this.#records[(this.#head + i) % 1024];
      if (record) records.push(record);
    }
    return records;
  }
  get bytes(): number {
    return this.#bytes;
  }
  get size(): number {
    return this.#size;
  }
}
