import { loadEngine } from "../../../src/memory/loader.ts";
import { viewUnion } from "./view-union.ts";
export function viewActions(
  action: (name: string, run: () => Promise<unknown>) => void,
  canvas: HTMLCanvasElement,
) {
  for (const mode of ["capacity", "release", "submit"] as const)
    action(`Run view union ${mode}`, async () => {
      await loadEngine();
      return viewUnion(canvas, mode);
    });
}
