// Diagnostic exact oracle only; never imported by application code.
export interface Dyadic {
  n: bigint;
  e: number;
}
export function integer(n: bigint): Dyadic {
  return { n, e: 0 };
}
export function decode(value: number): Dyadic {
  if (!Number.isFinite(value)) throw Error("nonfinite-oracle-input");
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value, false);
  const bits = view.getBigUint64(0, false);
  const exponent = Number((bits >> 52n) & 2047n);
  const fraction = bits & ((1n << 52n) - 1n);
  const magnitude = exponent === 0 ? fraction : (1n << 52n) + fraction;
  return {
    n: bits >> 63n ? -magnitude : magnitude,
    e: exponent === 0 ? -1074 : exponent - 1023 - 52,
  };
}
export function add(a: Dyadic, b: Dyadic): Dyadic {
  const e = Math.min(a.e, b.e);
  return { n: (a.n << BigInt(a.e - e)) + (b.n << BigInt(b.e - e)), e };
}
export function subtract(a: Dyadic, b: Dyadic): Dyadic {
  return add(a, { n: -b.n, e: b.e });
}
export function multiply(a: Dyadic, b: Dyadic): Dyadic {
  return { n: a.n * b.n, e: a.e + b.e };
}
export function absolute(a: Dyadic): Dyadic {
  return { n: a.n < 0n ? -a.n : a.n, e: a.e };
}
export function equal(a: Dyadic, b: Dyadic): boolean {
  return subtract(a, b).n === 0n;
}
export function withinQuarter(error: Dyadic): boolean {
  return subtract(absolute(error), { n: 1n, e: -2 }).n <= 0n;
}
export function approximate(a: Dyadic): number {
  const magnitude = absolute(a).n;
  if (magnitude === 0n) return 0;
  const shift = Math.max(0, magnitude.toString(2).length - 53);
  const top = magnitude >> BigInt(shift);
  const topExponent = top.toString(2).length - 1;
  const significand = Number(top) / 2 ** topExponent;
  const exponent = a.e + shift + topExponent;
  const value =
    exponent < -1022
      ? significand * 2 ** (exponent + 1074) * Number.MIN_VALUE
      : significand * 2 ** exponent;
  return a.n < 0n ? -value : value;
}
