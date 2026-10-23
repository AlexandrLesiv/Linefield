import { scene } from "./scene-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { PreparedPage, Entry } from "./prepared-store.ts";
import type { ReleaseOwnership } from "./release-ownership.ts";
type Borrow = { count: number; retired: boolean; bytes: number; owner: Entry | undefined };
export class PageBorrows {
  private values = new Map<bigint, Borrow>();
  private retiredBytes = 0;
  private retiredPages = 0;
  private state: () => ReplyValue;
  private uncertainty: ReleaseOwnership;
  constructor(state: () => ReplyValue, uncertainty: ReleaseOwnership) {
    this.state = state;
    this.uncertainty = uncertainty;
  }
  borrow(page: PreparedPage) {
    const record: Borrow = this.values.get(page.page) ?? {
      count: 0,
      retired: false,
      bytes: page.data.byteLength,
      owner: page.owner,
    };
    record.count++;
    if (record.owner) record.owner.borrowers++;
    this.values.set(page.page, record);
    let returned = false;
    return {
      ...page,
      release: () => {
        if (returned) return;
        returned = true;
        record.count--;
        if (record.owner) record.owner.borrowers--;
        if (record.count === 0) {
          try {
            if (record.retired) this.release(page.page);
          } finally {
            if (record.retired) {
              this.retiredBytes -= record.bytes;
              this.retiredPages--;
            }
            this.values.delete(page.page);
          }
        }
      },
    };
  }
  attach(page: PreparedPage, owner: Entry) {
    page.owner = owner;
    const record = this.values.get(page.page);
    if (!record) return;
    record.owner = owner;
    owner.borrowers += record.count;
  }
  retire(page: PreparedPage) {
    const record = this.values.get(page.page);
    if (record) {
      if (!record.retired) {
        this.retiredBytes += record.bytes;
        this.retiredPages++;
      }
      record.retired = true;
    } else this.release(page.page);
  }
  private release(page: bigint) {
    this.uncertainty.release("pages", () => scene.release(this.state(), page));
  }
  resources() {
    return { bytes: this.retiredBytes, pages: this.retiredPages, records: this.values.size };
  }
}
