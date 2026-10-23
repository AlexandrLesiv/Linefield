import { loadEngine } from "../../../src/memory/loader.ts";
import { viewUnion } from "./view-union.ts";
import { coldLookahead } from "./cold-lookahead.ts";
import { coldProgress } from "./cold-progress.ts";
export function viewActions(
  action: (name: string, run: () => Promise<unknown>) => void,
  canvas: HTMLCanvasElement,
) {
  for (const mode of ["order", "boundary", "cancel", "query-error", "progress"] as const)
    action(`Run cold lookahead ${mode}`, async () => {
      await loadEngine();
      return mode === "progress" ? coldProgress(canvas) : coldLookahead(canvas, mode);
    });
  for (const mode of ["capacity", "release", "submit"] as const)
    action(`Run view union ${mode}`, async () => {
      await loadEngine();
      return viewUnion(canvas, mode);
    });
}
