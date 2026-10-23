import { preparation } from "./preparation-bridge.ts";
import type { ReplyValue } from "./bridge.ts";
import type { ReleaseOwnership } from "./release-ownership.ts";
import type { PendingOwnership } from "./pending-preparation.ts";
export class PreparationTicket {
  private settled = false;
  private pending: PendingOwnership;
  private clipped: boolean;
  private releaseToken: () => void;
  constructor(
    token: bigint,
    clipped: boolean,
    pending: PendingOwnership,
    ownership: ReleaseOwnership,
    state: () => ReplyValue,
  ) {
    this.pending = pending;
    this.clipped = clipped;
    this.releaseToken = () =>
      ownership.release("tickets", () => preparation.release(state(), token));
    if (clipped) pending.tickets++;
  }
  transfer() {
    if (this.settled) throw Error("preparation-ticket-owner");
    this.settled = true;
    if (this.clipped) this.pending.tickets--;
  }
  release() {
    if (this.settled) return;
    this.settled = true;
    try {
      this.releaseToken();
    } finally {
      if (this.clipped) this.pending.tickets--;
    }
  }
}
