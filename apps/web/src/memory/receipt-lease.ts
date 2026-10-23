import { frames } from "./frame-bridge.ts";
import { cleanupRelease, CleanupFailure } from "./cleanup-failure.ts";
import type { ReplyValue } from "./bridge.ts";
import type { Receipt } from "./frame-receipt.ts";
export class ReceiptLeases {
  private owned = new Set<ReceiptLease>();
  private incoming: Receipt | undefined;
  private incomingFailure: CleanupFailure | undefined;
  adopt(receipt: Receipt, state: ReplyValue) {
    this.incoming = receipt;
    try {
      const lease = this.create(receipt, state);
      this.incoming = undefined;
      return lease;
    } catch (error) {
      try {
        cleanupRelease(() => frames.release(state, receipt.id));
        this.incoming = undefined;
      } catch (failure) {
        this.incomingFailure =
          failure instanceof CleanupFailure ? failure : new CleanupFailure(failure);
        throw this.incomingFailure;
      }
      throw error;
    }
  }
  create(receipt: Receipt, state: ReplyValue) {
    if (this.owned.size >= 8) throw Error("receipt-lease-capacity");
    const lease = new ReceiptLease(receipt, state, () => this.owned.delete(lease));
    this.owned.add(lease);
    return lease;
  }
  resources() {
    const count = this.owned.size + (this.incoming ? 1 : 0);
    return {
      metadataEstimate: count * 192,
      receiptLeases: count,
      uncertainReceiptLeases:
        [...this.owned].filter((v) => v.failed).length + (this.incomingFailure ? 1 : 0),
    };
  }
  drained() {
    if (this.incomingFailure) throw this.incomingFailure;
    if (this.owned.size || this.incoming)
      throw new CleanupFailure(Error("receipt-lease-ownership"));
  }
  combine<T extends { metadataEstimate?: number }>(base: T) {
    const leases = this.resources();
    return {
      ...base,
      ...leases,
      metadataEstimate: (base.metadataEstimate ?? 0) + leases.metadataEstimate + 256,
    };
  }
}
export class ReceiptLease {
  readonly receipt: Receipt;
  private count = 1;
  private state: ReplyValue;
  private closed: () => void;
  failed = false;
  private failure: CleanupFailure | undefined;
  constructor(receipt: Receipt, state: ReplyValue, closed: () => void) {
    this.receipt = receipt;
    this.state = state;
    this.closed = closed;
  }
  borrow() {
    if (this.count !== 1 || this.failed) throw Error("receipt-lease-borrow");
    this.count++;
    return this.reference();
  }
  reference() {
    let released = false;
    return () => {
      if (this.failure) throw this.failure;
      if (released) return;
      released = true;
      if (this.failed) throw Error("receipt-lease-failed");
      if (this.count > 1) {
        this.count--;
        return;
      }
      try {
        cleanupRelease(() => frames.release(this.state, this.receipt.id));
        this.count = 0;
        this.closed();
      } catch (error) {
        this.failed = true;
        this.failure = error instanceof CleanupFailure ? error : new CleanupFailure(error);
        throw this.failure;
      }
    };
  }
}
