import { preparation } from "./preparation-bridge.ts";
import { PageBorrows } from "./page-borrows.ts";
import { ReleaseOwnership } from "./release-ownership.ts";
import { Residency, transition } from "./residency.ts";
import type { ResidencyToken, IdleBudget } from "./residency.ts";
import type { ReplyValue } from "./bridge.ts";
import { geometryMetrics as metrics } from "./geometry-metrics.ts";
export type PreparedPage = {
  page: bigint;
  data: Float32Array;
  release?: () => void;
  owner?: Entry;
};
export type Entry = {
  key: string;
  stroke: bigint;
  revision: bigint;
  detail: number;
  token: bigint;
  pages: PreparedPage[];
  bytes: number;
  used: number;
  admitted: number;
  pins: number;
  borrowers: number;
  stale: boolean;
};
export class PreparedOwnership {
  protected entries = new Map<string, Set<Entry>>();
  protected lru = new Map<Entry, true>();
  protected bytes = 0;
  protected pages = 0;
  protected tickets = 0;
  protected state: () => ReplyValue;
  protected borrows: PageBorrows;
  protected uncertainty = new ReleaseOwnership();
  protected residency: Residency;
  private retiring: Entry | undefined;
  private retiringSlots = 0;
  private scan: MapIterator<Entry> | undefined;
  private scanning = 0;
  constructor(state: () => ReplyValue, failed?: (error: unknown) => void) {
    this.state = state;
    this.borrows = new PageBorrows(state, this.uncertainty);
    this.residency = new Residency((credit, budget) => this.idle(credit, budget), failed);
  }
  begin() {
    this.scan = undefined;
    const token = this.residency.open();
    if (this.retiring) this.residency.resume();
    return token;
  }
  end(token: ResidencyToken, accepted: boolean) {
    if (accepted && this.residency.active === token && this.residency.enabled)
      metrics.preparedIdleCredits++;
    this.residency.close(token, accepted);
  }
  protected retain(entry: Entry) {
    const entries = this.entries.get(entry.key) ?? new Set<Entry>();
    entries.add(entry);
    this.entries.set(entry.key, entries);
    this.lru.set(entry, true);
    this.bytes += entry.bytes;
    this.pages += entry.pages.length;
    if (entry.token) this.tickets++;
    for (const page of entry.pages) this.borrows.attach(page, entry);
  }
  protected unlink(entry: Entry) {
    const entries = this.entries.get(entry.key);
    entries?.delete(entry);
    if (!entries?.size) this.entries.delete(entry.key);
  }
  protected clear(entry: Entry) {
    this.unlink(entry);
    entry.stale = true;
    if (entry.pins) return;
    // Lifecycle/stale cleanup is synchronous and is NOT covered by the idle timing claim.
    let failure: unknown;
    while (entry.pages.length) {
      try {
        this.releasePage(entry);
      } catch (error) {
        failure ??= error;
      }
    }
    try {
      this.releaseTicket(entry);
    } catch (error) {
      failure ??= error;
    }
    if (!entry.token) this.lru.delete(entry);
    if (failure) throw failure;
  }
  private releasePage(entry: Entry) {
    const page = entry.pages.pop();
    if (!page) return;
    this.bytes -= page.data.byteLength;
    this.pages--;
    entry.bytes -= page.data.byteLength;
    this.borrows.retire(page);
  }
  private releaseTicket(entry: Entry) {
    if (!entry.token) return;
    try {
      this.uncertainty.release("tickets", () => preparation.release(this.state(), entry.token));
    } finally {
      entry.token = 0n;
      this.tickets--;
    }
  }
  protected clearStore() {
    this.residency.stop();
    let failure: unknown;
    for (const entry of this.lru.keys()) {
      try {
        this.clear(entry);
      } catch (error) {
        failure ??= error;
      }
    }
    if (this.retiring) {
      try {
        this.clear(this.retiring);
      } catch (error) {
        failure ??= error;
      }
      if (!this.retiring.token && !this.retiring.pages.length) {
        this.retiring = undefined;
        this.retiringSlots = 0;
      }
    }
    if (failure) throw failure;
  }
  protected room(bytes: number, pages: number, tickets = 0) {
    const held = this.resources();
    return (
      this.residency.enabled &&
      held.bytes + bytes <= 8 * 1024 ** 2 &&
      held.pages + pages <= 3072 &&
      held.tickets + tickets <= 192
    );
  }
  private idle(credit: ResidencyToken | undefined, budget: IdleBudget): boolean {
    while (transition(budget)) {
      if (this.retiring) {
        if (this.retiring.pages.length) this.releasePage(this.retiring);
        else if (this.retiring.token) this.releaseTicket(this.retiring);
        else {
          this.retiring = undefined;
          this.retiringSlots = 0;
        }
        continue;
      }
      if (!credit || this.residency.active) return false;
      const held = this.resources();
      const byteShort = 8 * 1024 ** 2 - held.bytes < credit.bytes;
      const pageShort = 3072 - held.pages < credit.pages;
      const ticketShort = 192 - held.tickets < credit.tickets;
      if (!byteShort && !pageShort && !ticketShort) return false;
      if (!this.scan || this.scanning !== credit.sequence) {
        this.scanning = credit.sequence;
        this.scan = this.lru.keys();
      }
      const entry = this.scan?.next().value;
      if (!entry) return false;
      if (
        entry.used === credit.sequence ||
        entry.pins ||
        entry.borrowers ||
        (!byteShort && !pageShort && !entry.token)
      )
        continue;
      this.unlink(entry);
      this.lru.delete(entry);
      this.retiring = entry;
      this.retiringSlots = entry.pages.length;
      metrics.preparedPressureRetirements++;
    }
    return !!this.retiring || !!credit;
  }
  resources() {
    const borrowed = this.borrows.resources();
    return {
      bytes: this.bytes + borrowed.bytes,
      pages: this.pages + borrowed.pages + this.uncertainty.pages,
      tickets: this.tickets + this.uncertainty.tickets,
      uncertainDescriptors: this.uncertainty.pages,
      uncertainTickets: this.uncertainty.tickets,
      streamOnly: false,
      // Conservative host estimate, separate from exact typed-array payload.
      metadataEstimate:
        this.lru.size * 256 +
        this.pages * 96 +
        borrowed.records * 96 +
        (this.retiring ? 256 : 0) +
        this.retiringSlots * 8 +
        384,
    };
  }
}
