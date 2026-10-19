import { coefficients, addR } from "./rotation-corpus.ts";
import type { RotationRow } from "./rotation-corpus.ts";
import { bits, numberFromBits } from "./oracle.ts";
import { rational, fromNumber, subtractR, multiplyR } from "../regional/rational.ts";
const compare = (a: ReturnType<typeof rational>, b: ReturnType<typeof rational>): bigint =>
  a.n * b.d - b.n * a.d;

export function rotationCulling(): RotationRow[] {
  const rows: RotationRow[] = [];
  function row(
    step: number,
    rx: bigint,
    ry: bigint,
    x: number,
    y: number,
    zoom: number,
    extent: number,
  ): void {
    const pair = coefficients[step];
    if (!pair) throw Error("coefficient");
    const { c, s } = pair;
    const wx = addR(rational(rx * 65536n), fromNumber(x));
    const wy = addR(rational(ry * 65536n), fromNumber(y));
    const point = addR(multiplyR(wx, fromNumber(c)), multiplyR(wy, fromNumber(s)));
    const padding = multiplyR(
      fromNumber(256 + 2 ** -38),
      addR(fromNumber(Math.abs(c)), fromNumber(Math.abs(s))),
    );
    const lower = multiplyR(subtractR(point, padding), fromNumber(zoom));
    const upper = multiplyR(addR(point, padding), fromNumber(zoom));
    const half = fromNumber(extent / 2 + 2);
    const outside = compare(lower, half) > 0n || compare(upper, rational(-half.n, half.d)) < 0n;
    rows.push({
      kind: "rotated-painted-axis",
      input: `B ${rx} ${ry} ${x} ${y} ${zoom} ${extent} ${c} ${s}`,
      expected: outside ? "B outside" : "B eligible",
    });
  }
  const extreme = (1n << 64n) - 1n;
  for (let step = 0; step < 24; step += 1)
    for (const rx of [-extreme, 0n, extreme])
      for (const ry of [-extreme, 0n, extreme])
        for (const zoom of [0.1, 1, 8])
          for (const extent of [1, 8192]) row(step, rx, ry, 0, 0, zoom, extent);
  const touch = 4096 + 2 + 256 + 2 ** -38;
  for (const step of [0, 6, 12, 18])
    for (const sign of [-1, 1])
      for (const coordinate of [
        numberFromBits(bits(touch) - 1n),
        touch,
        numberFromBits(bits(touch) + 1n),
      ])
        row(step, 0n, 0n, sign * coordinate, sign * coordinate, 1, 8192);
  return rows;
}
