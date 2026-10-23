import { check, rasterFixture } from "./raster-host.ts";
export { check, rasterFixture } from "./raster-host.ts";
export function rasterMatrix() {
  const rows = [];
  for (const backing of [1, 2, 1.25])
    for (const zoom of [0.05, 1])
      for (const angle of [0, Math.PI / 12, Math.PI / 2, Math.PI])
        for (const far of [false, true]) {
          const f = rasterFixture(backing, zoom, angle, far);
          try {
            for (const shift of [0, 1, -1, 256, -255, 0.5, -0.5, 1 + 2 ** -30, 1 - 2 ** -30]) {
              const begin = f.begin(0.125, -0.25);
              const result = f.update(1n, 0.125 + shift, -0.25);
              const view = f.view();
              // This finite corpus has exact dyadic subtraction/products in binary64.
              const expected = Number.isInteger(shift * backing);
              const row = {
                backing,
                zoom,
                angle,
                far,
                shift,
                expected,
                ...result,
                canonical: {
                  regionX: String(view.regionX),
                  regionY: String(view.regionY),
                  localX: view.localX,
                  localY: view.localY,
                },
              };
              rows.push(row);
              if (far)
                check(
                  view.regionX > 9007199254740000n && view.regionY > 9007199254740000n,
                  "far regions retained as bigint",
                  row,
                );
              check(
                result.enabled === expected &&
                  result.outcome === (expected ? "integral" : "fractional"),
                "exact classification",
                row,
              );
              if (expected) check(result.x === begin.x + shift * backing, "exact offset", row);
              const end = f.terminal(1n);
              check(
                expected ? end.epoch === begin.epoch : end.epoch !== begin.epoch,
                "End lineage",
                { row, begin, end },
              );
              check(
                end.layout[1]! <= 256 && end.layout[2]! <= 512 && end.layout[3]! <= 3072,
                "isolated layout",
                end,
              );
            }
          } finally {
            f.dispose();
          }
        }
  return {
    evidence: "actual shared pan/Wasm; isolated proof, no residual/render/pixel claim",
    rows,
    integral: rows.filter((row) => row.expected).length,
    fractional: rows.filter((row) => !row.expected).length,
  };
}
