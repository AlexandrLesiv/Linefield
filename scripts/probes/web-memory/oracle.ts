import { add, decode, integer, multiply } from "../regional/dyadic.ts";

export const minimum = -(1n << 63n);
export const maximum = (1n << 63n) - 1n;
const scale = 1n << 1090n;

export function bits(value: number): bigint {
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  return view.getBigUint64(0);
}

export function numberFromBits(value: bigint): number {
  const view = new DataView(new ArrayBuffer(8));
  view.setBigUint64(0, value);
  return view.getFloat64(0);
}

export function normalized(region: bigint, a: number, b: number): string {
  const exact = add(multiply(integer(region), integer(65536n)), add(decode(a), decode(b)));
  const value = exact.n << BigInt(exact.e + 1074);
  let q = value / scale;
  let residual = value % scale;
  if (residual < 0n) {
    q -= 1n;
    residual += scale;
  }
  if (q < minimum || q > maximum) return "E CoordinateOverflow";
  const shift = Math.max(0, residual.toString(2).length - 53);
  let significand = residual >> BigInt(shift);
  if (shift > 0) {
    const tail = residual - (significand << BigInt(shift));
    const half = 1n << BigInt(shift - 1);
    if (tail > half || (tail === half && significand % 2n !== 0n)) significand += 1n;
  }
  let local = shift === 0 ? numberFromBits(significand) : Number(significand) * 2 ** (shift - 1074);
  if (local === 65536) {
    if (q === maximum) return "E CoordinateOverflow";
    q += 1n;
    local = 0;
  }
  return `N ${q} ${bits(local)}`;
}
