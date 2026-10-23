import { SparseInterval } from "./sparse-interval.ts";
import type { SparseStorage } from "./sparse-storage.ts";
export class SparseProjection {
  readonly interval: SparseInterval;
  maximumUncertainty = 0;
  constructor(storage: SparseStorage) {
    this.interval = new SparseInterval(storage.registers, storage.bits);
  }
  begin(matrix: Float32Array) {
    const n = this.interval;
    n.valid = matrix.length === 6;
    this.maximumUncertainty = 0;
    for (let i = 0; i < 6; i++) n.exact(i, matrix[i] ?? NaN);
    n.scale(9, 0, 1);
    return n.valid;
  }
  capsule(data: Float32Array, index: number, output: Float64Array) {
    const n = this.interval,
      offset = index * 6;
    for (let endpoint = 0; endpoint < 2; endpoint++) {
      const first = offset + endpoint * 3,
        target = 10 + endpoint * 3;
      n.exact(6, data[first] ?? NaN);
      n.exact(7, data[first + 1] ?? NaN);
      n.exact(8, data[first + 2] ?? NaN);
      if (n.lo(8) < 0) n.valid = false;
      n.affine(target, 0, 2, 6, 7, 4);
      n.affine(target + 1, 1, 3, 6, 7, 5);
      n.mul(target + 2, 8, 9);
    }
    n.put(16, Math.max(n.lo(12), n.lo(15)), Math.max(n.hi(12), n.hi(15)));
    n.exact(17, 2);
    n.add(18, 16, 17);
    for (let axis = 0; axis < 2; axis++) {
      n.put(
        19,
        Math.min(n.lo(10 + axis), n.lo(13 + axis)),
        Math.min(n.hi(10 + axis), n.hi(13 + axis)),
      );
      n.put(
        20,
        Math.max(n.lo(10 + axis), n.lo(13 + axis)),
        Math.max(n.hi(10 + axis), n.hi(13 + axis)),
      );
      n.sub(21, 19, 18);
      n.add(22, 20, 18);
      const uncertainty = n.next(Math.max(n.hi(21) - n.lo(21), n.hi(22) - n.lo(22)), true);
      this.maximumUncertainty = Math.max(this.maximumUncertainty, uncertainty);
      if (!(uncertainty < 2 - 1.414214)) n.valid = false;
      output[offset + axis] = Math.floor(n.lo(21));
      output[offset + axis + 2] = Math.ceil(n.hi(22));
    }
    return n.valid;
  }
}
// Explicit adopted fixed-function engineering premise, not an IEEE viewport claim.
export function sparseViewport(
  n: SparseInterval,
  width: number,
  height: number,
  precision: number,
  subpixels: number,
) {
  if (
    !Number.isFinite(precision) ||
    precision < 23 ||
    !Number.isInteger(subpixels) ||
    subpixels < 4 ||
    subpixels > 52
  )
    return false;
  const add = (a: number, b: number) => n.next(a + b, true);
  const mul = (a: number, b: number) => n.next(a * b, true);
  // Actual shader p/D*2-1: 3ULP division, 1ULP multiply, 1ULP subtract.
  const clip = add(add(mul(2, mul(3, 2 ** -22)), 2 ** -21), 2 ** -22);
  for (let axis = 0; axis < 2; axis++) {
    const dimension = axis ? height : width;
    if (!Number.isSafeInteger(dimension) || dimension < 64 || dimension > 8192) return false;
    const e = 2e-5,
      magnitude = add(1, clip),
      division = mul(magnitude, e);
    const scaled = mul(add(magnitude, division), dimension / 2),
      scaleError = mul(scaled, e);
    const translationError = mul(add(add(scaled, scaleError), dimension / 2), e);
    const propagated = add(add(mul(division, dimension / 2), scaleError), translationError);
    const envelope = mul(mul(4, e), dimension);
    if (
      !(
        propagated <= envelope &&
        add(add(mul(dimension / 2, clip), envelope), 2 ** -subpixels) < 0.5
      )
    )
      return false;
  }
  return true;
}
