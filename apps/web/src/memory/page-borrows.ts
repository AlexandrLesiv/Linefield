import { scene } from "./scene-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedPage } from "./prepared-store.ts";
type Borrow = { count: number; retired: boolean; bytes: number };
export class PageBorrows {
  private values = new Map<bigint, Borrow>();
  private state: () => ReplyValue;
  constructor(state: () => ReplyValue) {
    this.state = state;
  }
  borrow(page: PreparedPage) {
    const record = this.values.get(page.page) ?? {
      count: 0,
      retired: false,
      bytes: page.data.byteLength,
    };
    record.count++;
    this.values.set(page.page, record);
    let returned = false;
    return {
      ...page,
      release: () => {
        if (returned) return;
        returned = true;
        record.count--;
        if (record.count === 0) {
          if (record.retired) scene.release(this.state(), page.page);
          this.values.delete(page.page);
        }
      },
    };
  }
  retire(page: PreparedPage) {
    const record = this.values.get(page.page);
    if (record) record.retired = true;
    else scene.release(this.state(), page.page);
  }
  resources() {
    let bytes = 0,
      pages = 0;
    for (const record of this.values.values())
      if (record.retired) {
        bytes += record.bytes;
        pages++;
      }
    return { bytes, pages };
  }
}
