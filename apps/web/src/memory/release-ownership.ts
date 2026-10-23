import { editorHealthy } from "./editor-health.ts";
import { CleanupFailure } from "./cleanup-failure.ts";
// A failed release drops no ownership claim. Only bounded scalar uncertainty remains;
// known host arrays may be reclaimed, but these descriptor/ticket charges fence admission.
export class ReleaseOwnership {
  pages = 0;
  tickets = 0;
  release(kind: "pages" | "tickets", action: () => string) {
    if (!editorHealthy()) {
      this[kind]++;
      return;
    }
    try {
      const code = action();
      if (code !== "ok" && code !== "stale-session") throw Error(`release-${code}`);
    } catch (error) {
      this[kind]++;
      throw error instanceof CleanupFailure ? error : new CleanupFailure(error);
    }
  }
}
