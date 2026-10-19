import { bits, maximum, minimum, numberFromBits } from "./oracle.ts";
import { normalizeR } from "./viewport-oracle.ts";
import { fromNumber, multiplyR, rational, subtractR } from "../regional/rational.ts";
import type { Rational } from "../regional/rational.ts";
import type { ViewportRow } from "./viewport-corpus.ts";

const add = (a: Rational, b: Rational): Rational => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const world = (region: bigint, local: number) => add(rational(region * 65536n), fromNumber(local));
const compare = (a: Rational, b: Rational) => a.n * b.d - b.n * a.d;
export interface CullingRow extends ViewportRow {
  projected?: Rational[];
}
export function cullingCorpus(): CullingRow[] {
  const rows: CullingRow[] = [];
  function push(
    kind: string,
    center: bigint,
    local: number,
    low: bigint,
    lowLocal: number,
    high: bigint,
    highLocal: number,
    zoom: number,
    extent: number,
    fringe: number,
  ) {
    const base = world(center, local);
    const projected = [
      subtractR(world(low, lowLocal), fromNumber(256)),
      add(world(high, highLocal), fromNumber(256)),
    ].map((bound) =>
      add(multiplyR(subtractR(bound, base), fromNumber(zoom)), fromNumber(extent / 2)),
    );
    const lower = projected[0];
    const upper = projected[1];
    if (!lower || !upper) throw Error("missing-bound");
    const outside =
      compare(lower, fromNumber(extent + fringe)) > 0n || compare(upper, fromNumber(-fringe)) < 0n;
    rows.push({
      kind,
      input: `C ${low} ${lowLocal} ${high} ${highLocal} ${center} ${local} ${zoom} ${extent} 256 ${fringe}`,
      expected: outside ? "C outside" : "C eligible",
      ...(outside ? {} : { projected }),
    });
  }
  function position(region: bigint, local: number, offset: number) {
    const fields = normalizeR(add(world(region, local), fromNumber(offset))).split(" ");
    if (fields[0] === "E") return undefined;
    if (!fields[1] || !fields[2]) throw Error("invalid-normalized-position");
    return { region: BigInt(fields[1]), local: numberFromBits(BigInt(fields[2])) };
  }
  for (const region of [minimum, 0n, maximum])
    for (const local of [0, 32768])
      for (const zoom of [0.1, 1, 8])
        for (const extent of [1, 8192])
          for (const fringe of [0, 2, 4096]) {
            const edge = (extent / 2 + fringe) / zoom + 256;
            for (const [low, high] of [
              [-81920, 81920],
              [0, 0],
              [edge, edge],
              [-edge, -edge],
              [edge + 1, edge + 2],
              [edge, edge + 163840],
              [-edge - 163840, -edge],
              [-edge - 2, -edge - 1],
            ]) {
              if (low === undefined || high === undefined) throw Error("missing-template");
              const start = position(region, local, low);
              const end = position(region, local, high);
              if (start && end)
                push(
                  "regional-painted-cull",
                  region,
                  local,
                  start.region,
                  start.local,
                  end.region,
                  end.local,
                  zoom,
                  extent,
                  fringe,
                );
            }
          }
  for (const center of [minimum, 0n, maximum])
    for (const stroke of [minimum, 0n, maximum])
      for (const zoom of [0.1, 8])
        push("distant-regional-cull", center, 0, stroke, 0, stroke, 1, zoom, 8192, 2);
  // Exact dyadic touching and adjacent binary64 fixtures retain touching, reject outside.
  for (const point of [257, numberFromBits(bits(257) - 1n), numberFromBits(bits(257) + 1n)])
    push("touching-painted-cull", 0n, 0, 0n, point, 0n, point, 1, 2, 0);
  return rows;
}
export function approximateR(value: Rational): number {
  const numerator = value.n < 0n ? -value.n : value.n;
  if (numerator === 0n) return 0;
  const nShift = Math.max(0, numerator.toString(2).length - 53);
  const dShift = Math.max(0, value.d.toString(2).length - 53);
  return (
    (Number(numerator >> BigInt(nShift)) / Number(value.d >> BigInt(dShift))) *
    2 ** (nShift - dShift)
  );
}
