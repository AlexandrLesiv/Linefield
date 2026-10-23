import type { PreparedPage } from "./prepared-store.ts";
import type { PageBorrows } from "./page-borrows.ts";
export type PendingOwnership = { bytes: number; pages: number; tickets: number };
// At most eight streaming readers own these bounded page arrays, never missed-page lists.
export class PendingPreparation {
  pages: PreparedPage[] = [];
  bytes = 0;
  totalBytes = 0;
  totalPages = 0;
  streaming = false;
  private ownership: PendingOwnership;
  private borrows: PageBorrows;
  constructor(ownership: PendingOwnership, borrows: PageBorrows) {
    this.ownership = ownership;
    this.borrows = borrows;
  }
  add(page: PreparedPage) {
    this.pages.push(page);
    this.bytes += page.data.byteLength;
    this.totalBytes = Math.min(3145729, this.totalBytes + page.data.byteLength);
    this.totalPages = Math.min(129, this.totalPages + 1);
    this.ownership.pages++;
    this.ownership.bytes += page.data.byteLength;
  }
  take() {
    const pages = this.pages;
    this.ownership.pages -= pages.length;
    this.ownership.bytes -= this.bytes;
    this.pages = [];
    this.bytes = 0;
    return pages;
  }
  release() {
    let failure: unknown;
    for (const page of this.take()) {
      try {
        this.borrows.retire(page);
      } catch (error) {
        failure ??= error;
      }
    }
    if (failure) throw failure;
  }
}
