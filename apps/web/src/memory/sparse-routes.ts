import type { SparseStorage } from "./sparse-storage.ts";
export type SparseWork = {
  visited: number;
  entries: number;
  instances: number;
  area: number;
  disabled: boolean;
};
export class SparseRoutes {
  entries = 0;
  descriptors = 0;
  slots = 0;
  instances = 0;
  area = 0;
  reason = "";
  private span = 0;
  private cursor = 0;
  private stride = 0;
  private tiles = 0;
  private left = 0;
  private top = 0;
  private across = 0;
  private spanSize = 0;
  private spanArea = 0;
  private padding = 0;
  readonly storage: SparseStorage;
  readonly count: number;
  readonly width: number;
  readonly height: number;
  readonly work: SparseWork;
  readonly stamp: number;
  constructor(
    storage: SparseStorage,
    count: number,
    width: number,
    height: number,
    work: SparseWork,
    stamp: number,
  ) {
    this.storage = storage;
    this.count = count;
    this.width = width;
    this.height = height;
    this.work = work;
    this.stamp = stamp;
  }
  refuse(reason: string) {
    this.reason = reason;
    return "refused" as const;
  }
  private start() {
    if (this.span % 16 === 0) {
      const c = this.storage.coarse,
        index = Math.floor(this.span / 16) * 4;
      if (
        (c[index + 2] ?? NaN) <= 0 ||
        (c[index + 3] ?? NaN) <= 0 ||
        (c[index] ?? NaN) >= this.width ||
        (c[index + 1] ?? NaN) >= this.height
      ) {
        this.span += 16;
        return true;
      }
    }
    const b = this.storage.fine,
      offset = this.span * 4;
    this.left = Math.max(0, Math.floor((b[offset] ?? NaN) / 64));
    this.top = Math.max(0, Math.floor((b[offset + 1] ?? NaN) / 64));
    const right = Math.min(Math.ceil(this.width / 64), Math.ceil((b[offset + 2] ?? NaN) / 64));
    const bottom = Math.min(Math.ceil(this.height / 64), Math.ceil((b[offset + 3] ?? NaN) / 64));
    this.across = Math.max(0, right - this.left);
    this.tiles = this.across * Math.max(0, bottom - this.top);
    this.spanSize = Math.min(2, this.count - this.span * 2);
    this.cursor = 0;
    this.spanArea = 0;
    if (!Number.isSafeInteger(this.tiles) || this.tiles > 1024) return false;
    if (!this.tiles) {
      this.span++;
      return true;
    }
    this.stride = 1;
    while (this.stride < this.tiles) this.stride *= 2;
    const instances = this.spanSize * this.stride;
    if (this.work.instances + instances > 3000000) this.work.disabled = true;
    if (
      this.entries + this.stride > 16384 ||
      this.descriptors >= 512 ||
      this.instances + instances > 32768 ||
      this.work.entries + this.stride > 262144 ||
      this.work.instances + instances > Math.min(3000000, this.work.visited * 36)
    )
      return false;
    this.instances += instances;
    this.work.instances += instances;
    this.work.entries += this.stride;
    return true;
  }
  private tile() {
    const x = this.left + (this.cursor % this.across),
      y = this.top + Math.floor(this.cursor / this.across);
    const s = this.storage,
      cell = y * 128 + x;
    if (x < 0 || y < 0 || x > 127 || y > 127) return false;
    let slot = s.slots[cell] ?? 0;
    if (s.stamps[cell] !== this.stamp) {
      if (this.slots >= Math.min(1024, Math.floor(this.width / 64) * Math.floor(this.height / 64)))
        return false;
      slot = this.slots++;
      s.slots[cell] = slot;
      s.stamps[cell] = this.stamp;
      s.destinations[slot * 2] = x;
      s.destinations[slot * 2 + 1] = y;
    }
    const route = (this.entries + this.cursor) * 4;
    s.routes[route] = x;
    s.routes[route + 1] = y;
    s.routes[route + 2] = slot % Math.floor(this.width / 64);
    s.routes[route + 3] = Math.floor(slot / Math.floor(this.width / 64));
    for (let i = 0; i < this.spanSize; i++) {
      const offset = (this.span * 2 + i) * 6,
        b = s.projection;
      const width = Math.max(
        0,
        Math.min(b[offset + 2] ?? 0, x * 64 + 64, this.width) - Math.max(b[offset] ?? 0, x * 64, 0),
      );
      const height = Math.max(
        0,
        Math.min(b[offset + 3] ?? 0, y * 64 + 64, this.height) -
          Math.max(b[offset + 1] ?? 0, y * 64, 0),
      );
      const area = width * height;
      if (!Number.isSafeInteger(area)) return false;
      this.spanArea += area;
      this.area += area;
      this.work.area += area;
      if (this.spanArea > 65536 || this.area > 4194304 || this.work.area > 16777216) return false;
    }
    return true;
  }
  private sentinel(index: number) {
    const offset = index * 4,
      r = this.storage.routes;
    r[offset] = 0;
    r[offset + 1] = 0;
    r[offset + 2] = -1;
    r[offset + 3] = 0;
  }
  transition(): "pending" | "done" | "refused" {
    if (this.reason) return "refused";
    if (this.span >= Math.ceil(this.count / 2)) {
      if (this.entries + this.padding < Math.ceil(this.entries / 1024) * 1024) {
        this.sentinel(this.entries + this.padding++);
        return "pending";
      }
      return "done";
    }
    if (!this.stride) return this.start() ? "pending" : this.refuse("route-work");
    if (this.cursor < this.tiles) {
      if (!this.tile()) return this.refuse("slot-or-area");
    } else this.sentinel(this.entries + this.cursor);
    if (++this.cursor === this.stride) {
      const offset = this.descriptors++ * 8,
        d = this.storage.descriptors;
      d[offset] = this.span * 2;
      d[offset + 1] = this.spanSize;
      d[offset + 2] = this.entries;
      d[offset + 3] = this.stride;
      d[offset + 4] = this.spanSize;
      d[offset + 5] = this.spanSize * this.stride;
      d[offset + 6] = 0;
      d[offset + 7] = 0;
      this.storage.projection[this.span * 12 + 4] = this.spanArea;
      this.entries += this.stride;
      this.span++;
      this.stride = 0;
    }
    return "pending";
  }
}
