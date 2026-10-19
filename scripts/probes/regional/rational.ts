import { decode } from "./dyadic.ts";
export interface Rational {
  n: bigint;
  d: bigint;
}
export function rational(n: bigint, d = 1n): Rational {
  if (d === 0n) throw Error("zero-denominator");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  let a = n < 0n ? -n : n;
  let b = d;
  while (b !== 0n) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return { n: n / a, d: d / a };
}
export function fromNumber(value: number): Rational {
  const { n, e } = decode(value);
  return e >= 0 ? rational(n << BigInt(e)) : rational(n, 1n << BigInt(-e));
}
export const subtractR = (a: Rational, b: Rational): Rational =>
  rational(a.n * b.d - b.n * a.d, a.d * b.d);
export const multiplyR = (a: Rational, b: Rational): Rational => rational(a.n * b.n, a.d * b.d);
export const divideR = (a: Rational, b: Rational): Rational => rational(a.n * b.d, a.d * b.n);
export const withinQuarterR = (a: Rational): boolean => (a.n < 0n ? -a.n : a.n) * 4n <= a.d;
export const serializeR = (a: Rational) => ({
  numerator: a.n.toString(),
  denominator: a.d.toString(),
});
