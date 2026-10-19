import type { CanvasKit } from "canvaskit-wasm";
import { bridge } from "../../../src/memory/bridge.ts";
import { penBridge } from "../../../src/memory/pen-bridge.ts";
import { Presentation } from "../../../src/memory/presentation.ts";
import { accepted, seedUndo, turn } from "./undo-input.ts";
import { preparePaths, deletePaths } from "./undo-paths.ts";
import { drawPaths, pixels, comparePixels } from "./undo-draw.ts";
import { environment } from "./environment.ts";

export async function undoCheckpoint(kit: CanvasKit, canvas: HTMLCanvasElement) {
  const query = new URLSearchParams(location.search);
  const large = query.get("size") === "large";
  const sparse = query.get("shape") === "sparse";
  const [width, height] = large ? [4096, 2048] : [1024, 768];
  let state = accepted(bridge.create());
  state = accepted(bridge.enter(state.owner));
  state = accepted(bridge.metrics(state, 1n, width!, height!, 1));
  const display = new Presentation(kit, canvas, width!, height!);
  display.render();
  state = accepted(bridge.presented(state));
  const host = environment(canvas);
  const results = [];
  const setup = [];
  try {
    state = await seedUndo(state, width!, height!, sparse);
    const seeded = bridge.read(state.owner);
    const retained = await preparePaths(kit, state, width!, height!, false);
    deletePaths(retained.paths);
    // Prime loading/JIT once, then retain no experiment paths before reconstructed modes.
    for (const mode of ["rebuild", "retained-full-path", "cull-proxy"] as const) {
      const setupStart = performance.now();
      const reusable =
        mode === "retained-full-path"
          ? await preparePaths(kit, state, width!, height!, false)
          : undefined;
      if (reusable)
        setup.push({
          mode,
          wallMs: performance.now() - setupStart,
          timing: reusable.timing,
          copiedBytes: reusable.copiedBytes,
        });
      try {
        for (let repeat = 0; repeat < 3; repeat++) {
          for (const command of ["undo", "redo"] as const) {
            const start = performance.now();
            state = accepted(penBridge[command](state));
            const commandMs = performance.now() - start;
            const preparationStart = performance.now();
            const prepared =
              reusable ?? (await preparePaths(kit, state, width!, height!, mode === "cull-proxy"));
            const preparationWallMs = performance.now() - preparationStart;
            const paths =
              reusable && command === "undo" ? prepared.paths.slice(0, 1) : prepared.paths;
            try {
              const rendered = drawPaths(kit, display, paths);
              results.push({
                mode,
                repeat,
                command,
                commandMs,
                preparationWallMs,
                preparation: reusable ? null : prepared.timing,
                inputVerbs: prepared.inputVerbs,
                retainedVerbs: prepared.retainedVerbs,
                copiedBytes: reusable ? 0 : prepared.copiedBytes,
                ...rendered,
                commandToSubmissionMs: performance.now() - start,
                resources: display.stats(),
                experimentLivePaths: prepared.paths.length,
              });
            } finally {
              if (!reusable) deletePaths(prepared.paths);
            }
            await turn();
          }
        }
      } finally {
        if (reusable) deletePaths(reusable.paths);
      }
    }
    // Direct removal/restoration of the large stroke, distinct from replay after Undo above.
    state = accepted(penBridge.undo(state));
    const directLargeStroke = [];
    for (const command of ["undo", "redo"] as const) {
      const start = performance.now();
      state = accepted(penBridge[command](state));
      const commandMs = performance.now() - start;
      const prepared = await preparePaths(kit, state, width!, height!, false);
      try {
        const rendered = drawPaths(kit, display, prepared.paths);
        directLargeStroke.push({
          command,
          commandMs,
          strokeCount: bridge.read(state.owner).strokeCount,
          preparation: prepared.timing,
          ...rendered,
          commandToSubmissionMs: performance.now() - start,
        });
      } finally {
        deletePaths(prepared.paths);
      }
      await turn();
    }
    state = accepted(penBridge.redo(state));
    // Readback and parity comparison are intentionally outside all timing samples.
    const reference = await preparePaths(kit, state, width!, height!, false);
    drawPaths(kit, display, reference.paths);
    const baselinePixels = pixels(kit, display);
    drawPaths(kit, display, reference.paths);
    const reuseParity = comparePixels(baselinePixels, pixels(kit, display));
    deletePaths(reference.paths);
    const filtered = await preparePaths(kit, state, width!, height!, true);
    drawPaths(kit, display, filtered.paths);
    const cullingParity = comparePixels(baselinePixels, pixels(kit, display));
    deletePaths(filtered.paths);
    const maximumMeasuredBlockMs = Math.max(
      ...results.map((row) =>
        Math.max(row.uninterruptedRenderMs, row.preparation?.maximumPageTaskMs ?? 0),
      ),
      ...directLargeStroke.map((row) => row.uninterruptedRenderMs),
    );
    return {
      kind: "isolated-real-Rust-CanvasKit-Undo-Redo-feasibility",
      width,
      height,
      shape: sparse ? "sparse" : "dense",
      samples: 65_537,
      extraStroke: "one colored dot; Undo leaves long stroke, Redo restores dot above it",
      trajectory: sparse
        ? "x=W*(-1+3*i/65536); y=H*(0.5+0.4*sin(3*i/128))"
        : "x=W*(0.5+0.43*cos(i/128)); y=H*(0.5+0.4*sin(3*i/128))",
      host,
      seeded,
      completed: bridge.read(state.owner),
      results,
      setup,
      directLargeStroke,
      reuseParity,
      cullingParity,
      maximumMeasuredBlockMs,
      performanceVerdict: maximumMeasuredBlockMs >= 50 ? "failed" : "incomplete",
      limitations: [
        "3 repetitions per mode/command, fixed order; no p95 acceptance, no fully cold process per sample",
        "Proxy filters complete contours after real Rust projection/copy, positive conic hull bounds plus2px guard",
        "Proxy is not production Rust culling or a general geometry correctness proof",
        "Submission timers are not GPU completion, presentation, or physical input latency",
        "Measured synchronous blocks establish failures, not complete browser main-thread task monitoring",
        "Command-to-submission includes fixture setTimeout yields per page; differs from app4ms scheduler and excludes memoryPresented acknowledgement",
        "Retained-path construction reported separately; no optional cache or production renderer changes",
        "Resource registry excludes experiment paths; separate live-path count; byte estimates exclude driver overhead",
        "Parity readback allocations occur only after timed samples; no routine readback in production",
      ],
    };
  } finally {
    display.dispose();
    bridge.dispose(state.owner);
  }
}
