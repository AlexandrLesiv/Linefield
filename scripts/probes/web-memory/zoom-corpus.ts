import { bits, numberFromBits } from "./oracle.ts";
import { rounded } from "./viewport-oracle.ts";
import { divideR, fromNumber, multiplyR } from "../regional/rational.ts";
import type { ViewportRow } from "./viewport-corpus.ts";

export function zoomCorpus(): ViewportRow[] {
  const rows: ViewportRow[] = [];
  function push(zoom: number, direction: string) {
    let expected = "E InputBound";
    if (Number.isFinite(zoom) && zoom >= 0.1 && zoom <= 8 && ["in", "out"].includes(direction)) {
      const value =
        direction === "in"
          ? multiplyR(fromNumber(zoom), fromNumber(1.25))
          : divideR(fromNumber(zoom), fromNumber(1.25));
      const lower = fromNumber(0.1);
      const next =
        value.n * lower.d < lower.n * value.d ? 0.1 : value.n > 8n * value.d ? 8 : rounded(value);
      expected = `Z ${bits(next)}`;
    }
    rows.push({ kind: "center-zoom-step", input: `Z ${zoom} ${direction}`, expected });
  }
  for (const boundary of [0.1, 0.125, 1, 6.4, 8])
    for (const delta of [-1n, 0n, 1n])
      for (const direction of ["in", "out"])
        push(numberFromBits(bits(boundary) + delta), direction);
  for (const direction of ["in", "out"]) {
    let zoom = 1;
    for (let index = 0; index < 16; index += 1) {
      push(zoom, direction);
      zoom = direction === "in" ? Math.min(8, zoom * 1.25) : Math.max(0.1, zoom / 1.25);
    }
  }
  push(1, "invalid");
  return rows;
}
