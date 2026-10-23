import { GpuRenderer } from "../../../src/memory/gpu-renderer.ts";
import { SparseStorage } from "../../../src/memory/sparse-storage.ts";
import { SparseGpu } from "../../../src/memory/sparse-gpu.ts";
import { sparseCostSource } from "./sparse-cost-source.ts";
import type { CostGroup, CostKind } from "./sparse-cost-source.ts";
import { sparseCostPass } from "./sparse-cost-pass.ts";
import { sparseCostProbe } from "./sparse-cost-probe.ts";
import { sparseCostPixels } from "./sparse-cost-pixels.ts";
import { samplingDifference, samplingImage } from "./sampling-pixels.ts";
import { retireRenderer } from "./retire-renderer.ts";
type Pass = Awaited<ReturnType<typeof sparseCostPass>> & {
  sparse: boolean;
  repetition: number;
  measured: ReturnType<typeof sparseCostProbe>["counts"];
};
type Comparison = { repetition: number; difference: ReturnType<typeof samplingDifference> };
const kinds: readonly CostKind[] = ["thin", "thick", "compact", "diagonal", "multipage"];
const sizes = [
  [1024, 768],
  [4096, 2048],
] as const;
function sourceMetadata(groups: readonly CostGroup[]) {
  return groups.map((g) => ({
    samples: g.samples,
    pages: g.pages.length,
    capsules: g.pages.reduce((sum, p) => sum + p.data.length / 6, 0),
  }));
}
async function cold(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  groups: readonly CostGroup[],
  optional: boolean,
) {
  const started = performance.now(),
    renderer = new GpuRenderer(canvas, width, height);
  let sparse: { storage: SparseStorage; executor: SparseGpu } | undefined;
  const probe = sparseCostProbe(renderer),
    cleanup = { milliseconds: 0 };
  try {
    if (optional) sparse = { storage: new SparseStorage(), executor: new SparseGpu(renderer) };
    const setup = performance.now() - started;
    const pass = await sparseCostPass(renderer, groups, sparse);
    return {
      optional,
      setup,
      setupAndFirstUse: performance.now() - started,
      pass,
      work: { ...probe.counts },
      gpuResources: renderer.resources.bytes,
      plannerBytes: sparse?.storage.payloadBytes ?? 0,
      routeBytes: sparse?.executor.routeBytes ?? 0,
      cleanup,
    };
  } finally {
    probe.close();
    const begin = performance.now();
    await retireRenderer(renderer);
    sparse?.executor.dispose();
    cleanup.milliseconds = performance.now() - begin;
  }
}
// Frozen isolated screen: no app flag, no timing readback, no favorable retries.
export async function sparseCostScreen(canvas: HTMLCanvasElement, timed: boolean) {
  const rows = [],
    coldPairs = [],
    started = performance.now();
  // Two format runs together have at most six minutes of timed work.
  const deadline = started + 180000;
  let pair = 0;
  try {
    for (const [width, height] of sizes) {
      if (timed) {
        const source = sparseCostSource(width, height, "thin");
        try {
          const samples: Awaited<ReturnType<typeof cold>>[] = [];
          const record = {
            width,
            height,
            source: sourceMetadata(source.groups),
            samples,
            status: "running",
          };
          coldPairs.push(record);
          for (const optional of width === 1024 ? [false, true] : [true, false]) {
            if (performance.now() > deadline) throw Error("fixed screen deadline");
            samples.push(await cold(canvas, width, height, source.groups, optional));
          }
          record.status = "complete";
        } finally {
          source.close();
        }
      }
      for (const kind of kinds) {
        const preparation = performance.now(),
          source = sparseCostSource(width, height, kind);
        const preparationMs = performance.now() - preparation;
        const renderer = new GpuRenderer(canvas, width, height);
        let executor: SparseGpu | undefined;
        const probe = sparseCostProbe(renderer);
        const passes: Pass[] = [],
          comparisons: Comparison[] = [];
        try {
          executor = new SparseGpu(renderer);
          const optional = { storage: new SparseStorage(), executor };
          const row = {
            width,
            height,
            kind,
            packed: renderer.resources.packed,
            preparationMs,
            source: sourceMetadata(source.groups),
            passes,
            comparisons,
            gpuResources: renderer.resources.bytes,
            plannerBytes: optional.storage.payloadBytes,
            routeBytes: optional.executor.routeBytes,
            opaqueObjects: {
              plannerViewsAndBuffer: optional.storage.wrapperObjects,
              extraPrograms: 2,
              routeTextures: 2,
            },
            status: "running",
          };
          rows.push(row);
          for (let repetition = 0; repetition < (timed ? 3 : 1); repetition++) {
            const order = timed && pair++ % 2 ? [true, false] : [false, true];
            let reference: Uint8Array | undefined;
            for (const sparse of order) {
              if (timed && performance.now() > deadline) throw Error("fixed screen deadline");
              probe.reset();
              const pass = await sparseCostPass(
                renderer,
                source.groups,
                sparse ? optional : undefined,
              );
              const record = { sparse, repetition, ...pass, measured: { ...probe.counts } };
              passes.push(record);
              if (!timed) {
                const pixels = sparseCostPixels(renderer);
                if (!sparse) reference = pixels;
                else {
                  if (!reference) throw Error("missing full reference");
                  const difference = samplingDifference(pixels, reference);
                  comparisons.push({ repetition, difference });
                  if (difference.changed || !difference.ink || (kind === "thin" && !pass.admitted))
                    throw Error(
                      `screen parity/positive ${JSON.stringify({
                        width,
                        height,
                        kind,
                        source: sourceMetadata(source.groups),
                        record,
                        difference,
                        full: await samplingImage(renderer, reference),
                        sparse: await samplingImage(renderer, pixels),
                      })}`,
                    );
                }
              }
            }
          }
          row.status = "complete";
        } finally {
          probe.close();
          await retireRenderer(renderer);
          executor?.dispose();
          source.close();
        }
      }
    }
    return {
      timed,
      rows,
      coldPairs,
      elapsed: performance.now() - started,
      evidence:
        "isolated stream-backed scene planning to validated S; preparation outside endpoint; no arena warm-history or app acknowledgement claim; cold means renderer/resource construction in the same browser context",
    };
  } catch (error) {
    throw Error(
      `sparse screen stopped ${JSON.stringify({ error: String(error), timed, rows, coldPairs })}`,
      { cause: error },
    );
  }
}
