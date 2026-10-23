import { regionSubmitFailure } from "./region-submit-failure.ts";
import { regionAlpha } from "./region-alpha.ts";
import { regionPhases } from "./region-phases.ts";
import { regionHeldFold } from "./region-held-fold.ts";
import { regionReleaseFailure } from "./region-release-failure.ts";
import { regionProvenance } from "./region-provenance.ts";
import { regionFailures } from "./region-failures.ts";
import { regionCapability } from "./region-capability.ts";
import { loadEngine } from "../../../src/memory/loader.ts";
import { regionPixels } from "./region-pixels.ts";
export function regionActions(
  action: (name: string, run: () => Promise<unknown>) => void,
  canvas: HTMLCanvasElement,
) {
  action("Run region provenance", async () => {
    await loadEngine();
    return regionProvenance(canvas);
  });
  action("Run region context loss", async () => {
    await loadEngine();
    return regionSubmitFailure(canvas, true);
  });
  action("Run region release failure", async () => {
    await loadEngine();
    return regionReleaseFailure(canvas);
  });
  action("Run region held fold", async () => {
    await loadEngine();
    return regionHeldFold(canvas);
  });
  action("Run region phases", async () => {
    await loadEngine();
    return regionPhases(canvas);
  });
  action("Run region alpha exhaustion", async () => {
    await loadEngine();
    return regionAlpha(canvas);
  });
  action("Run region submission failure", async () => {
    await loadEngine();
    return regionSubmitFailure(canvas);
  });
  for (const mode of ["placement", "source"] as const)
    action(`Run region failure ${mode}`, async () => {
      await loadEngine();
      return regionFailures(canvas, mode);
    });
  action("Run region capability", async () => {
    await loadEngine();
    return regionCapability(canvas);
  });
  for (const matrix of [false, true])
    action(`Run region ${matrix ? "matrix" : "pixels"}`, async () => {
      await loadEngine();
      return regionPixels(canvas, matrix);
    });
}
