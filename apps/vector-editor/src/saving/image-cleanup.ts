import { checkedImageCore } from "../image-boundary";
import type { SaveCore } from "./types";
import type { Storage } from "./adapter";
import { inputPending } from "./prepare";

// One canonical retirement slice or one worker step per idle turn. The worker
// independently verifies HEAD/grant and never treats this permission as a lease.
export function imageCleanup(raw: SaveCore, store: Storage) {
  const core = checkedImageCore(raw);
  let cursor = 0,
    revision = -1n,
    requested = true;
  return {
    request() {
      requested = true;
    },
    async step() {
      if (inputPending()) return true;
      const current = raw.delta_revision();
      if (current !== revision) cursor = 0;
      if (cursor < core.image_count()) {
        const next = core.image_cleanup_step(cursor, 64) >>> 0;
        if (next === 0xffffffff) return true;
        cursor = next;
        revision = raw.delta_revision();
        requested ||= revision !== current;
        return true;
      }
      revision = current;
      if (!requested) return (await store.maintain()).pending;
      const permitted = core.image_cleanup_revision();
      if (permitted < 0n || permitted !== raw.delta_revision() || inputPending()) return true;
      const pending = (await store.maintainAssets(permitted.toString())).pending;
      requested = pending;
      return pending;
    },
  };
}
