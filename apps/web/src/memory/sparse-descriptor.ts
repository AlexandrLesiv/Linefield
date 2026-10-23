import type { SparseStorage } from "./sparse-storage.ts";
export function sparseDescriptor(
  s: SparseStorage,
  index: number,
  first: number,
  size: number,
  route: number,
  stride: number,
  area: number,
) {
  const d = s.descriptors,
    previous = (index - 1) * 8;
  const oldFirst = d[previous] ?? 0,
    oldCount = d[previous + 1] ?? 0;
  const oldArea = s.projection[oldFirst * 6 + 4] ?? 0;
  if (
    index > 0 &&
    d[previous + 3] === stride &&
    d[previous + 4] === size &&
    oldFirst + oldCount === first &&
    (d[previous + 2] ?? 0) + (oldCount / size) * stride === route &&
    (oldCount + size) * stride <= 4096 &&
    oldArea + area <= 65536
  ) {
    d[previous + 1] = oldCount + size;
    d[previous + 5] = (oldCount + size) * stride;
    s.projection[oldFirst * 6 + 4] = oldArea + area;
    return index;
  }
  const offset = index * 8;
  d[offset] = first;
  d[offset + 1] = size;
  d[offset + 2] = route;
  d[offset + 3] = stride;
  d[offset + 4] = size;
  d[offset + 5] = size * stride;
  d[offset + 6] = 0;
  d[offset + 7] = 0;
  s.projection[first * 6 + 4] = area;
  return index + 1;
}
