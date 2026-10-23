import type { Bounds } from "./gpu-scissor.ts";
export type RegionCopy = { overlap: Bounds; dirty: Bounds[]; shift: readonly [number, number] };
export type RegionRead = RegionCopy & { valid: () => boolean; uncertain: () => void };
export function regionCopy(
  width: number,
  height: number,
  shift: readonly [number, number],
): RegionCopy | undefined {
  if (![width, height, ...shift].every(Number.isSafeInteger) || width < 1 || height < 1)
    return undefined;
  const [x, y] = shift;
  const overlap: Bounds = [
    Math.max(0, x),
    Math.max(0, y),
    Math.min(width, width + x),
    Math.min(height, height + y),
  ];
  const [left, top, right, bottom] = overlap;
  if (left >= right || top >= bottom) return undefined;
  const dirty: Bounds[] = [
    [0, 0, width, top],
    [0, bottom, width, height],
    [0, top, left, bottom],
    [right, top, width, bottom],
  ];
  return { overlap, dirty: dirty.filter((b) => b[0] < b[2] && b[1] < b[3]), shift };
}
export function intersections(bounds: Bounds, regions: readonly Bounds[]): Bounds[] {
  return regions
    .map(
      (b) =>
        [
          Math.max(bounds[0], b[0]),
          Math.max(bounds[1], b[1]),
          Math.min(bounds[2], b[2]),
          Math.min(bounds[3], b[3]),
        ] satisfies Bounds,
    )
    .filter((b) => b[0] < b[2] && b[1] < b[3]);
}
export const area = (b: Bounds) => (b[2] - b[0]) * (b[3] - b[1]);
