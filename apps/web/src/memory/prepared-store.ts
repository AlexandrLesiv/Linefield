import { preparation } from "./preparation-bridge.ts";
import { frames } from "./frame-bridge.ts";
import { PageBorrows } from "./page-borrows.ts";
import type { ReplyValue } from "./bridge.ts";
export type PreparedPage = { page: bigint; data: Float32Array; release?: () => void };
export type Entry = {
  stroke: bigint;
  revision: bigint;
  detail: number;
  token: bigint;
  pages: PreparedPage[];
  bytes: number;
  used: number;
  pins: number;
};
export class PreparedStore {
  protected entries = new Map<string, Entry[]>();
  protected bytes = 0;
  protected pages = 0;
  protected tickets = 0;
  protected frame = 0;
  protected state: () => ReplyValue;
  protected borrows: PageBorrows;
  constructor(state: () => ReplyValue) {
    this.state = state;
    this.borrows = new PageBorrows(state);
  }
  begin() {
    this.frame++;
  }
  borrow(page: PreparedPage) {
    return this.borrows.borrow(page);
  }
  protected retained(
    stroke: bigint,
    revision: bigint,
    detail: number,
    frame: bigint,
    chunk: bigint,
  ) {
    const entries = this.entries.get(`${stroke}:${chunk}`) ?? [];
    let hit: Entry | undefined;
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry) continue;
      if (entry.revision !== revision) {
        this.clear(entry);
        entries.splice(i, 1);
        continue;
      }
      if (
        entry.detail >= detail &&
        (!entry.token ||
          (frame
            ? frames.coverage(this.state(), entry.token, frame)
            : preparation.coverage(this.state(), entry.token)))
      )
        hit = entry;
    }
    return hit;
  }
  protected *retainedPages(hit: Entry): Generator<PreparedPage> {
    hit.used = this.frame;
    hit.pins++;
    try {
      yield* hit.pages;
    } finally {
      hit.pins--;
    }
  }
  protected clear(entry: Entry) {
    for (const p of entry.pages) this.borrows.retire(p);
    if (entry.token) {
      preparation.release(this.state(), entry.token);
      this.tickets--;
    }
    this.bytes -= entry.bytes;
    this.pages -= entry.pages.length;
  }
  protected trim(bytes: number, pages: number, ticket = false) {
    for (const [key, entries] of this.entries) {
      for (let i = entries.length - 1; i >= 0; i--) {
        const e = entries[i];
        if (!e || e.pins) continue;
        if (
          this.bytes + bytes <= 8 * 1024 ** 2 &&
          this.pages + pages <= 3072 &&
          (!ticket || this.tickets < 192)
        )
          return;
        if (e.used === this.frame && (!ticket || this.tickets < 192)) continue;
        this.clear(e);
        entries.splice(i, 1);
      }
      if (!entries.length) this.entries.delete(key);
    }
  }
  protected clearStore() {
    for (const entries of this.entries.values()) for (const e of entries) this.clear(e);
    this.entries.clear();
  }
  resources() {
    const retired = this.borrows.resources();
    return {
      bytes: this.bytes + retired.bytes,
      pages: this.pages + retired.pages,
      streamOnly: false,
    };
  }
}
