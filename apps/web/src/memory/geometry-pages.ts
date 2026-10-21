import { scene } from "./scene-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
type CachedPage = { page: bigint; data: Float32Array };
type Entry = { prefix: string; pages: CachedPage[] };
const maxBytes = 16 * 1024 * 1024;
const maxPages = 3072;
const transientPages = 512;
export class GeometryPages {
  private entries = new Map<string, Entry>();
  private chunks = new Map<string, string>();
  private disposable = new Set<string>();
  private used = new Set<string>();
  begin() {
    this.used.clear();
  }
  finish() {
    for (const key of this.entries.keys()) if (!this.used.has(key)) this.disposable.add(key);
  }
  private bytes = 0;
  private count = 0;
  private streamOnly = false;
  private state: () => ReplyValue;
  constructor(state: () => ReplyValue) {
    this.state = state;
  }
  *read(id: bigint, count: bigint, detail: number): Generator<CachedPage> {
    const chunks = (count + 127n) / 128n;
    for (let chunk = 0n; chunk < chunks; chunk++) {
      const revision = count < (chunk + 1n) * 128n + 1n ? count : (chunk + 1n) * 128n + 1n;
      const prefix = `${id}:${chunk}:`;
      const key = `${prefix}${revision}:${detail}`;
      const old = this.chunks.get(prefix);
      if (old && old !== key) this.drop(old);
      this.disposable.delete(key);
      const cached = this.entries.get(key);
      if (cached) {
        this.used.add(key);
        this.entries.delete(key);
        this.entries.set(key, cached);
        yield* cached.pages;
        continue;
      }
      let pages: CachedPage[] = [],
        cursor = 0n,
        total = 0,
        streaming = this.streamOnly,
        stored = false;
      try {
        for (;;) {
          if (!streaming) this.trim(pages.length + 1, total + 24576);
          if (
            !streaming &&
            (pages.length >= transientPages ||
              this.count + pages.length >= maxPages ||
              this.bytes + total + 24576 > maxBytes)
          ) {
            for (const prior of pages) scene.release(this.state(), prior.page);
            pages = [];
            total = 0;
            streaming = true;
          }
          const page = scene.page(this.state(), id, revision, chunk, detail, cursor);
          if (page.code !== "ok") throw Error(page.code);
          const value = { page: page.page, data: page.data };
          if (
            !streaming &&
            (total + value.data.byteLength > maxBytes || pages.length === maxPages)
          ) {
            for (const prior of pages) scene.release(this.state(), prior.page);
            pages = [];
            total = 0;
            streaming = true;
          }
          if (!streaming) {
            pages.push(value);
            total += value.data.byteLength;
          }
          try {
            yield value;
          } finally {
            if (streaming) scene.release(this.state(), value.page);
          }
          if (page.done) break;
          if (page.next === 0n || page.next === cursor) throw Error("geometry-progress");
          cursor = page.next;
        }
        if (!streaming) {
          this.entries.set(key, { prefix, pages });
          this.chunks.set(prefix, key);
          this.used.add(key);
          this.bytes += total;
          this.count += pages.length;
          stored = true;
        }
      } finally {
        if (!stored) for (const page of pages) scene.release(this.state(), page.page);
      }
    }
  }
  private drop(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return;
    for (const page of entry.pages) {
      this.bytes -= page.data.byteLength;
      this.count--;
      scene.release(this.state(), page.page);
    }
    this.entries.delete(key);
    this.used.delete(key);
    this.chunks.delete(entry.prefix);
    this.disposable.delete(key);
  }
  private trim(count: number, bytes: number) {
    for (const key of this.disposable) {
      if (this.count + count <= maxPages && this.bytes + bytes <= maxBytes) break;
      this.drop(key);
    }
  }
  dispose() {
    for (const key of this.entries.keys()) this.drop(key);
  }
  reduce() {
    this.dispose();
    this.streamOnly = true;
  }
  resources() {
    return { bytes: this.bytes, pages: this.count, streamOnly: this.streamOnly };
  }
}
