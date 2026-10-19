import { diagnostic } from "./diagnostics.ts";
import type { MemoryView } from "./view.ts";
export function recoverDisplay(
  suspend: () => void,
  destroy: () => void,
  view: MemoryView,
  session: bigint,
  fatal: () => void,
): void {
  try {
    suspend();
  } catch {
    fatal();
    return;
  }
  destroy();
  view.status("resourceUnavailable");
  diagnostic("display", "failed", session);
}
