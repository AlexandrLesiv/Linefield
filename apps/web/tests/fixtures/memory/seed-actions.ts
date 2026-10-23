import { loadEngine } from "../../../src/memory/loader.ts";
import { seedQuery } from "./seed-query.ts";
import { seedRender } from "./seed-render.ts";
import { seedFailure } from "./seed-failure.ts";
import { seedPressure } from "./seed-pressure.ts";
import { seedPublication } from "./seed-publication.ts";
import { seedRelease } from "./seed-release.ts";
import { rasterMatrix } from "./raster-proof.ts";
import { rasterState } from "./raster-state.ts";
export function seedActions(
  action: (name: string, run: () => Promise<unknown>) => void,
  canvas: HTMLCanvasElement,
) {
  for (const [name, run] of [
    ["matrix", rasterMatrix],
    ["state", rasterState],
  ] as const)
    action(`Run raster proof ${name}`, async () => {
      await loadEngine();
      return run();
    });
  const cases: [string, () => unknown][] = [
    ...(["promote", "fold", "create", "create-release"] as const).map(
      (mode) =>
        [`publication-${mode}`, () => seedPublication(canvas, mode)] satisfies [
          string,
          () => unknown,
        ],
    ),
    ["query", seedQuery],
    ["release", () => seedRelease(canvas)],
    ["render", () => seedRender(canvas, false)],
    ["invisible", () => seedRender(canvas, true)],
    ...(["before", "after", "draw"] as const).map(
      (phase) => [phase, () => seedFailure(canvas, phase)] satisfies [string, () => unknown],
    ),
    ...(["capacity", "same", "multiple"] as const).map(
      (mode) => [mode, () => seedPressure(canvas, mode)] satisfies [string, () => unknown],
    ),
  ];
  for (const [name, run] of cases)
    action(`Run prefix seed ${name}`, async () => {
      await loadEngine();
      return run();
    });
}
