import { fromNumber, multiplyR, subtractR } from "../regional/rational.ts";
import type { Rational } from "../regional/rational.ts";
import { numberFromBits } from "./oracle.ts";

export function contained(input: string): boolean {
  const values = input.split(" ").slice(1).map(Number);
  const [x0, y0, x1, y1, r0, r1] = values;
  if (
    x0 === undefined ||
    y0 === undefined ||
    x1 === undefined ||
    y1 === undefined ||
    r0 === undefined ||
    r1 === undefined
  )
    throw Error("paint-reference-input");
  const dx = subtractR(fromNumber(x1), fromNumber(x0));
  const dy = subtractR(fromNumber(y1), fromNumber(y0));
  const dr = subtractR(fromNumber(r0), fromNumber(r1));
  const x2 = multiplyR(dx, dx);
  const y2 = multiplyR(dy, dy);
  const radius2 = multiplyR(dr, dr);
  return subtractR({ n: x2.n * y2.d + y2.n * x2.d, d: x2.d * y2.d }, radius2).n <= 0n;
}

function magnitude(value: Rational): number {
  const n = value.n < 0n ? -value.n : value.n;
  const shift = Math.max(0, n.toString(2).length - 53);
  const dshift = Math.max(0, value.d.toString(2).length - 53);
  return (Number(n >> BigInt(shift)) / Number(value.d >> BigInt(dshift))) * 2 ** (shift - dshift);
}

export function radialResidual(input: string, answer: string): number {
  const source = input.split(" ").slice(1).map(Number);
  const fields = answer.split(" ").slice(2);
  let maxResidual = 0;
  for (let point = 0; point < 4; point += 1) {
    const at = point * 4;
    const xb = fields[at];
    const yb = fields[at + 2];
    const center = point % 2;
    const x = source[center * 2];
    const y = source[center * 2 + 1];
    const radius = source[4 + center];
    if (!xb || !yb || x === undefined || y === undefined || radius === undefined)
      throw Error("paint-reference-row");
    const dx = subtractR(fromNumber(numberFromBits(BigInt(xb))), fromNumber(x));
    const dy = subtractR(fromNumber(numberFromBits(BigInt(yb))), fromNumber(y));
    const x2 = multiplyR(dx, dx);
    const y2 = multiplyR(dy, dy);
    const radius2 = multiplyR(fromNumber(radius), fromNumber(radius));
    const error = subtractR({ n: x2.n * y2.d + y2.n * x2.d, d: x2.d * y2.d }, radius2);
    // |length-radius| <= |length²-radius²|/radius for strictly positive radii.
    maxResidual = Math.max(maxResidual, magnitude(error) / radius);
  }
  return maxResidual;
}
