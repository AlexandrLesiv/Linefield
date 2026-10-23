// Reviewed optional admission only: binary64 outward bounds plus GLSL ES3 highp errors.
export class SparseInterval {
  readonly values: Float64Array;
  private bits: DataView;
  valid = true;
  constructor(values: Float64Array, bits: DataView) {
    this.values = values;
    this.bits = bits;
  }
  next(value: number, up: boolean) {
    if (!Number.isFinite(value)) return value;
    if (value === 0) return up ? Number.MIN_VALUE : -Number.MIN_VALUE;
    this.bits.setFloat64(0, value, false);
    let high = this.bits.getUint32(0, false),
      low = this.bits.getUint32(4, false);
    if (value > 0 === up) {
      low = (low + 1) >>> 0;
      if (!low) high = (high + 1) >>> 0;
    } else {
      if (!low) high = (high - 1) >>> 0;
      low = (low - 1) >>> 0;
    }
    this.bits.setUint32(0, high, false);
    this.bits.setUint32(4, low, false);
    return this.bits.getFloat64(0, false);
  }
  lo(slot: number) {
    return this.values[slot * 2] ?? NaN;
  }
  hi(slot: number) {
    return this.values[slot * 2 + 1] ?? NaN;
  }
  put(slot: number, low: number, high = low) {
    this.values[slot * 2] = low;
    this.values[slot * 2 + 1] = high;
  }
  exact(slot: number, value: number) {
    if (!Number.isFinite(value) || (value !== 0 && Math.abs(value) < 2 ** -126)) this.valid = false;
    this.put(slot, value);
  }
  ulp(low: number, high: number) {
    const magnitude = Math.max(Math.abs(low), Math.abs(high));
    this.bits.setFloat32(0, magnitude, false);
    const exponent = (this.bits.getUint32(0, false) >>> 23) & 255;
    // Use the next binade's spacing, including a rounded-up boundary.
    return exponent > 0 && exponent < 255 ? 2 ** (exponent - 127 - 22) : NaN;
  }
  finish(slot: number, low: number, high: number, units: number) {
    if (low === 0 && high === 0) {
      this.put(slot, 0);
      return;
    }
    low = this.next(low, false);
    high = this.next(high, true);
    const error = this.next(this.ulp(low, high) * units, true);
    low = this.next(low - error, false);
    high = this.next(high + error, true);
    if (
      !Number.isFinite(low) ||
      !Number.isFinite(high) ||
      (low <= 0 && high >= 0) ||
      Math.min(Math.abs(low), Math.abs(high)) < 2 ** -126 ||
      Math.max(Math.abs(low), Math.abs(high)) > 3.4028234663852886e38
    )
      this.valid = false;
    this.put(slot, low, high);
  }
  add(out: number, a: number, b: number) {
    this.finish(out, this.lo(a) + this.lo(b), this.hi(a) + this.hi(b), 1);
  }
  sub(out: number, a: number, b: number) {
    this.finish(out, this.lo(a) - this.hi(b), this.hi(a) - this.lo(b), 1);
  }
  mul(out: number, a: number, b: number) {
    const p = this.lo(a) * this.lo(b),
      q = this.lo(a) * this.hi(b),
      r = this.hi(a) * this.lo(b),
      s = this.hi(a) * this.hi(b);
    this.finish(out, Math.min(p, q, r, s), Math.max(p, q, r, s), 1);
  }
  reciprocal(out: number, a: number, units = 3) {
    if (this.lo(a) <= 0 || this.hi(a) > 2 ** 126 || this.lo(a) < 2 ** -126) this.valid = false;
    this.finish(out, 1 / this.hi(a), 1 / this.lo(a), units);
  }
  private root(value: number, upper: boolean) {
    let result = Math.sqrt(value);
    for (let i = 0; i < 8; i++) {
      const square = result * result;
      if (upper ? this.next(square, false) >= value : this.next(square, true) <= value)
        return result;
      result = this.next(result, upper);
    }
    this.valid = false;
    return NaN;
  }
  scale(out: number, x: number, y: number) {
    this.mul(50, x, x);
    this.mul(51, y, y);
    this.add(52, 50, 51);
    if (this.lo(52) < 2 ** -60 || this.hi(52) > 2 ** 60) this.valid = false;
    const lower = this.root(this.lo(52), false),
      upper = this.root(this.hi(52), true);
    this.finish(53, 1 / upper, 1 / lower, 2);
    this.reciprocal(out, 53);
  }
  affine(out: number, m0: number, m1: number, x: number, y: number, t: number) {
    this.mul(54, m0, x);
    this.mul(55, m1, y);
    this.add(56, 54, 55);
    this.add(57, 56, t);
    this.add(56, 54, t);
    this.add(58, 56, 55);
    this.add(56, 55, t);
    this.add(59, 56, 54);
    // The separate-operation hull also encloses contraction (fewer roundings).
    this.put(
      out,
      Math.min(this.lo(57), this.lo(58), this.lo(59)),
      Math.max(this.hi(57), this.hi(58), this.hi(59)),
    );
  }
}
