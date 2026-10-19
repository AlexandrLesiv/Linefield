import { bits, maximum, minimum, numberFromBits } from "./oracle.ts";
import { divideR, fromNumber, rational, subtractR } from "../regional/rational.ts";
import type { Rational } from "../regional/rational.ts";

const add = (a: Rational, b: Rational): Rational => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const compare = (a: Rational, b: Rational): bigint => a.n * b.d - b.n * a.d;

// Independent binary search of binary64 values; candidate uses streaming quotient bits.
export function rounded(value: Rational): number {
  let low = 0n;
  let high = bits(65536);
  while (low + 1n < high) {
    const middle = (low + high) / 2n;
    if (compare(fromNumber(numberFromBits(middle)), value) <= 0n) low = middle;
    else high = middle;
  }
  const left = subtractR(value, fromNumber(numberFromBits(low)));
  const right = subtractR(fromNumber(numberFromBits(high)), value);
  const difference = compare(left, right);
  return numberFromBits(difference < 0n || (difference === 0n && low % 2n === 0n) ? low : high);
}

export function normalizeR(value: Rational): string {
  const divisor = value.d * 65536n;
  let region = value.n / divisor;
  if (value.n % divisor < 0n) region -= 1n;
  if (region < minimum || region > maximum) return "E CoordinateOverflow";
  const residual = rational(value.n - region * divisor, value.d);
  let local = rounded(residual);
  if (local === 65536) {
    if (region === maximum) return "E CoordinateOverflow";
    region += 1n;
    local = 0;
  }
  return `Q ${region} ${bits(local)}`;
}

export function mapped(
  region: bigint,
  local: number,
  a: number,
  b: number,
  zoom: number,
  limit: number,
): string {
  if (
    ![local, a, b, zoom].every(Number.isFinite) ||
    local < 0 ||
    local >= 65536 ||
    Math.abs(a) > 16384 ||
    Math.abs(b) > 16384 ||
    zoom < 0.1 ||
    zoom > 8
  )
    return "E InputBound";
  const difference = subtractR(fromNumber(a), fromNumber(b));
  if ((difference.n < 0n ? -difference.n : difference.n) > BigInt(limit) * difference.d)
    return "E InputBound";
  const center = add(rational(region * 65536n), fromNumber(local));
  return normalizeR(add(center, divideR(difference, fromNumber(zoom))));
}

export function naiveMapped(
  region: bigint,
  local: number,
  a: number,
  b: number,
  zoom: number,
): string {
  return normalizeR(add(rational(region * 65536n), fromNumber(local + (a - b) / zoom)));
}
