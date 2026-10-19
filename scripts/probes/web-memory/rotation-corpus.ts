import { maximum, minimum, numberFromBits, bits } from "./oracle.ts";
import { normalizeR } from "./viewport-oracle.ts";
import { rational, fromNumber, subtractR, multiplyR, divideR } from "../regional/rational.ts";
import type { Rational } from "../regional/rational.ts";

export const addR = (a: Rational, b: Rational): Rational =>
  rational(a.n * b.d + b.n * a.d, a.d * b.d);
// Fixed binary64 literals; exact cardinals, symmetric signs, no runtime trigonometry.
const sine = [
  0, 0.25881904510252074, 0.5, 0.7071067811865476, 0.8660254037844386, 0.9659258262890683, 1,
];
function sin(step: number): number {
  const index = ((step % 24) + 24) % 24;
  const quadrant = Math.floor(index / 6);
  const value = sine[quadrant % 2 === 0 ? index % 6 : 6 - (index % 6)];
  if (value === undefined) throw Error("coefficient-index");
  return quadrant >= 2 ? -value : value;
}
export const coefficients = Array.from({ length: 24 }, (_, step) => ({
  c: sin(step + 6),
  s: sin(step),
}));
export interface RotationRow {
  kind: string;
  input: string;
  expected: string;
}
type Position = readonly [number, number, number, number];

export function rotationCorpus(): RotationRow[] {
  const rows: RotationRow[] = [];
  function row(
    kind: string,
    step: number,
    region: bigint,
    local: number,
    p: Position,
    zoom: number,
    limit = 8192,
  ): void {
    const pair = coefficients[step];
    if (!pair) throw Error("step");
    const { c, s } = pair;
    const x = subtractR(fromNumber(p[0]), fromNumber(p[1]));
    const y = subtractR(fromNumber(p[2]), fromNumber(p[3]));
    const weighted = addR(multiplyR(x, fromNumber(c)), multiplyR(y, fromNumber(s)));
    const determinant = addR(
      multiplyR(fromNumber(c), fromNumber(c)),
      multiplyR(fromNumber(s), fromNumber(s)),
    );
    const center = addR(rational(region * 65536n), fromNumber(local));
    const invalid = [x, y].some((v) => (v.n < 0n ? -v.n : v.n) > BigInt(limit) * v.d);
    for (const mode of ["R", "I"]) {
      const displacement = divideR(
        mode === "I" ? divideR(weighted, determinant) : weighted,
        fromNumber(zoom),
      );
      rows.push({
        kind: `${kind}-${mode}`,
        input: `${mode} ${region} ${local} ${p.join(" ")} ${zoom} ${c} ${s} ${limit}`,
        expected: invalid ? "E InputBound" : normalizeR(addR(center, displacement)),
      });
    }
  }
  for (let step = 0; step < 24; step += 1) {
    for (const region of [minimum, 0n, maximum])
      for (const local of [0, 0.1, numberFromBits(bits(65536) - 1n)])
        for (const zoom of [0.1, 1, 8])
          for (const x of [-8192, 0, 8192])
            for (const y of [-8192, 0, 8192])
              row("regional", step, region, local, [x, 0, y, 0], zoom);
    for (const value of [Number.MIN_VALUE, 2 ** -1021, 2 ** -1000, numberFromBits(bits(1) + 1n)])
      for (const zoom of [0.1, 1, 8])
        for (const p of [
          [value, 0, 0, 0],
          [0, value, 0, 0],
          [value, 0, -value, 0],
          [1, value, -1, 0],
        ] as const)
          row("small-cancellation", step, 0n, 0, p, zoom);
    for (const zoom of [0.1, 1, 8])
      for (const p of [
        [8192, -8192, 8192, -8192],
        [-8192, 8192, 8192, -8192],
        [1, Number.MIN_VALUE, 1, 0],
        [0, 0, 0, 0],
      ] as const)
        for (const limit of [8192, 16384]) row("pan-difference", step, 0n, 0.1, p, zoom, limit);
    for (const p of [
      [8192, -Number.MIN_VALUE, 0, 0],
      [-8192, Number.MIN_VALUE, 0, 0],
      [8192, Number.MIN_VALUE, 0, 0],
      [1, 0, -numberFromBits(bits(1) + 1n), 0],
      [1, 0, -numberFromBits(bits(1) - 1n), 0],
    ] as const)
      row("boundary", step, 0n, 0, p, 0.1);
  }
  return rows;
}
