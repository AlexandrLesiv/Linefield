import CanvasKitInit from "canvaskit-wasm";
import type { Path } from "canvaskit-wasm";
import canvasWasm from "canvaskit-wasm/bin/canvaskit.wasm?url";
import { appendPathPage } from "../../../../src/memory/path-page.ts";
import type { PathPage } from "../../../../src/memory/path-page.ts";
import { groups } from "./geometry.ts";
import { surface } from "./surface.ts";
import { repaint } from "./union.ts";
import { comparePixels } from "../undo-draw.ts";

export type Request = { width: number; height: number; pages: PathPage[] };
const ready = CanvasKitInit({ locateFile: () => canvasWasm });
const stage = (name: string, details?: unknown) =>
  self.postMessage({ kind: "progress", stage: name, details });
async function run({ width, height, pages }: Request) {
  if (
    ![
      [1024, 768],
      [4096, 2048],
    ].some(([w, h]) => w === width && h === height) ||
    pages.length > 256
  )
    throw Error("fixture-bounds");
  stage("renderer-initialization");
  const kit = await ready;
  if (typeof kit.Path.MakeFromOp !== "function") throw Error("pathops-unavailable");
  const target = surface(kit, width, height);
  const builder = new kit.PathBuilder();
  const paths: Path[] = [];
  let reference: Path | undefined;
  try {
    stage("reference-preparation");
    for (const page of pages) appendPathPage(kit, builder, page);
    reference = builder.snapshot();
    target.canvas.clear(kit.WHITE);
    target.draw(reference);
    target.flush();
    const original = target.pixels();
    target.canvas.clear(kit.WHITE);
    target.draw(reference);
    target.flush();
    const referenceParity = comparePixels(original, target.pixels());
    if (referenceParity.differentChannels) throw Error("unstable-reference");
    stage("primitive-warmup");
    const warmBuilder = new kit.PathBuilder();
    const circle = warmBuilder.addCircle(16, 16, 4).detach();
    warmBuilder.delete();
    const warm = kit.Path.MakeFromOp(circle, circle, kit.PathOp.Union);
    circle.delete();
    if (!warm) throw Error("warmup-union-null");
    try {
      target.canvas.clear(kit.WHITE);
      target.draw(warm);
      target.export();
    } finally {
      warm.delete();
    }
    stage("candidate-preparation");
    const prepareStart = performance.now();
    let maximumGroupVerbs = 0;
    let maximumBuildMs = 0;
    for (const page of pages) {
      for (const group of groups(page)) {
        const start = performance.now();
        const part = new kit.PathBuilder();
        try {
          appendPathPage(kit, part, group);
          paths.push(part.snapshot());
        } finally {
          part.delete();
        }
        maximumBuildMs = Math.max(maximumBuildMs, performance.now() - start);
        maximumGroupVerbs = Math.max(maximumGroupVerbs, group.verbs.length);
        if (maximumBuildMs > 8) {
          stage("candidate-construction-unit-limit", { maximumBuildMs, maximumGroupVerbs });
          throw Error("candidate-construction-unit-limit");
        }
      }
    }
    const prepareMs = performance.now() - prepareStart;
    if (prepareMs > 500) {
      stage("candidate-construction-cold-limit", { prepareMs, maximumBuildMs });
      throw Error("candidate-construction-cold-limit");
    }
    const rows = [];
    let candidate = original;
    for (const halo of [1, 2, 4]) {
      let subdivisionMs = 0;
      stage(`candidate-halo-${halo}`, {
        environment: target.environment,
        referenceParity,
        prepareMs,
        maximumBuildMs,
        maximumGroupVerbs,
        groups: paths.length,
      });
      for (const size of [128, 64, 32]) {
        const timing = repaint(
          kit,
          target,
          paths,
          width,
          height,
          halo,
          size,
          stage,
          500 - prepareMs - subdivisionMs,
        );
        subdivisionMs += timing.wallMs;
        candidate = target.pixels();
        const parity = timing.stopped === "none" ? comparePixels(original, candidate) : null;
        rows.push({ halo, size, ...timing, coldMs: prepareMs + subdivisionMs, parity });
        if (!timing.oversized || prepareMs + subdivisionMs > 500) break;
      }
      if (rows.at(-1)!.stopped !== "none" || rows.at(-1)!.coldMs > 500) break;
    }
    const passes = rows.some(
      (row) =>
        !row.oversized &&
        row.stopped === "none" &&
        row.parity?.differentChannels === 0 &&
        row.maximumUnitMs <= 8 &&
        row.coldMs <= 500,
    );
    const result = {
      pathOpsAvailable: true,
      environment: target.environment,
      referenceParity,
      rows,
      prepareMs,
      maximumBuildMs,
      maximumGroupVerbs,
      groups: paths.length,
      candidateVerdict: passes ? "feasible-prefix" : "failed",
      limits: { maximumUnitMs: 8, coldMaximumMs: 500, exactParity: true },
      scope: "isolated-frozen-prefix; no live-input, query-speed, p95 or GPU-completion claim",
    };
    return { kind: "result", result, original, candidate };
  } finally {
    reference?.delete();
    for (const path of paths) path.delete();
    builder.delete();
    target.dispose();
  }
}
self.onmessage = (event: MessageEvent<Request>) => {
  void run(event.data)
    .then((value) =>
      self.postMessage(value, {
        transfer: [
          value.original.buffer,
          ...(value.candidate === value.original ? [] : [value.candidate.buffer]),
        ],
      }),
    )
    .catch((error: unknown) =>
      self.postMessage({
        kind: "failure",
        reason: error instanceof Error ? error.message : "worker-failed",
      }),
    );
};
