import type { CanvasKit, Path } from "canvaskit-wasm";
import type { RenderSurface } from "./surface.ts";

function verbCount(kit: CanvasKit, path: Path) {
  const lengths = new Map([
    [kit.MOVE_VERB, 2],
    [kit.LINE_VERB, 2],
    [kit.QUAD_VERB, 4],
    [kit.CONIC_VERB, 5],
    [kit.CUBIC_VERB, 6],
    [kit.CLOSE_VERB, 0],
  ]);
  const commands = path.toCmds();
  let count = 0;
  for (let i = 0; i < commands.length; count++) {
    const length = lengths.get(commands[i]!);
    if (length === undefined) throw Error("path-command");
    i += length + 1;
  }
  return count;
}

export function repaint(
  kit: CanvasKit,
  target: RenderSurface,
  paths: Path[],
  width: number,
  height: number,
  halo: number,
  size: number,
  report: (phase: string) => void,
  budgetMs: number,
) {
  const timing = {
    unionMs: 0,
    drawFlushMs: 0,
    exportMs: 0,
    maximumUnitMs: 0,
    maximumOutlineVerbs: 0,
    operations: 0,
    regions: 0,
    scanMs: 0,
  };
  const start = performance.now();
  target.canvas.clear(kit.WHITE);
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      const builder = new kit.PathBuilder();
      const clip = builder
        .addRect(
          kit.LTRBRect(
            x - halo,
            y - halo,
            Math.min(x + size, width) + halo,
            Math.min(y + size, height) + halo,
          ),
        )
        .detach();
      let accumulator = builder.snapshot();
      builder.delete();
      try {
        for (const path of paths) {
          const scanStart = performance.now();
          const bounds = path.getBounds();
          const finite = bounds.every(Number.isFinite);
          const outside =
            finite &&
            (bounds[2]! < x - halo ||
              bounds[0]! > x + size + halo ||
              bounds[3]! < y - halo ||
              bounds[1]! > y + size + halo);
          timing.scanMs += performance.now() - scanStart;
          if (performance.now() - start > budgetMs)
            return {
              ...timing,
              wallMs: performance.now() - start,
              oversized: false,
              stopped: "cold-limit",
            };
          if (outside) continue;
          const unitStart = performance.now();
          report(`union-operation-${timing.operations}`);
          const united = kit.Path.MakeFromOp(accumulator, path, kit.PathOp.Union);
          if (!united) throw Error("union-null");
          let clipped: Path | null = null;
          try {
            report(`intersection-operation-${timing.operations}`);
            clipped = kit.Path.MakeFromOp(united, clip, kit.PathOp.Intersect);
          } finally {
            united.delete();
          }
          if (!clipped) throw Error("intersect-null");
          accumulator.delete();
          accumulator = clipped;
          report(`outline-count-operation-${timing.operations}`);
          const count = verbCount(kit, accumulator);
          timing.maximumOutlineVerbs = Math.max(timing.maximumOutlineVerbs, count);
          const elapsed = performance.now() - unitStart;
          timing.unionMs += elapsed;
          timing.maximumUnitMs = Math.max(timing.maximumUnitMs, elapsed);
          timing.operations++;
          if (elapsed > 8)
            return {
              ...timing,
              wallMs: performance.now() - start,
              oversized: false,
              stopped: "unit-limit",
            };
          if (count > 4096)
            return {
              ...timing,
              wallMs: performance.now() - start,
              oversized: true,
              stopped: "complexity",
            };
          if (performance.now() - start > budgetMs)
            return {
              ...timing,
              wallMs: performance.now() - start,
              oversized: false,
              stopped: "cold-limit",
            };
        }
        const drawStart = performance.now();
        report(`draw-region-${timing.regions}`);
        target.canvas.save();
        try {
          target.canvas.clipRect(
            kit.LTRBRect(x, y, Math.min(x + size, width), Math.min(y + size, height)),
            kit.ClipOp.Intersect,
            false,
          );
          target.draw(accumulator);
        } finally {
          target.canvas.restore();
        }
        target.flush();
        const elapsed = performance.now() - drawStart;
        timing.drawFlushMs += elapsed;
        timing.maximumUnitMs = Math.max(timing.maximumUnitMs, elapsed);
        timing.regions++;
        if (elapsed > 8 || performance.now() - start > budgetMs)
          return {
            ...timing,
            wallMs: performance.now() - start,
            oversized: false,
            stopped: elapsed > 8 ? "unit-limit" : "cold-limit",
          };
      } finally {
        clip.delete();
        accumulator.delete();
      }
    }
  }
  const exportStart = performance.now();
  target.export();
  timing.exportMs = performance.now() - exportStart;
  timing.maximumUnitMs = Math.max(timing.maximumUnitMs, timing.exportMs);
  return {
    ...timing,
    wallMs: performance.now() - start,
    oversized: false,
    stopped:
      timing.maximumUnitMs > 8
        ? "unit-limit"
        : performance.now() - start > budgetMs
          ? "cold-limit"
          : "none",
  };
}
