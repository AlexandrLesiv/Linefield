import { bits, maximum, minimum, numberFromBits } from "./oracle.ts";
import { mapped, naiveMapped } from "./viewport-oracle.ts";

export interface ViewportRow {
  kind: string;
  input: string;
  expected: string;
  naive?: string;
}
const serialize = (value: number) => (Object.is(value, -0) ? "-0" : String(value));
export function viewportCorpus(): ViewportRow[] {
  const rows: ViewportRow[] = [];
  const next = (value: number, delta = 1n) => numberFromBits(bits(value) + delta);
  function push(
    kind: string,
    region: bigint,
    local: number,
    a: number,
    b: number,
    zoom: number,
    limit = 8192,
  ) {
    const expected = mapped(region, local, a, b, zoom, limit);
    rows.push({
      kind,
      input: `Q ${region} ${[local, a, b, zoom].map(serialize).join(" ")} ${limit}`,
      expected,
      ...(expected === "E InputBound"
        ? {}
        : {
            naive: naiveMapped(region, local, a, b, zoom),
          }),
    });
  }
  const regions = [minimum, minimum + 1n, -1n, 0n, 1n, maximum - 1n, maximum];
  const zooms = [0.1, next(0.1), 0.125, 0.8, 1, 1.25, next(8, -1n), 8];
  for (const region of regions)
    for (const local of [0, Number.MIN_VALUE, 0.1, 32768, next(65536, -1n)])
      for (const zoom of zooms)
        for (const offset of [
          -8192,
          -(2 ** -40),
          -Number.MIN_VALUE,
          0,
          Number.MIN_VALUE,
          2 ** -40,
          8192,
        ])
          push("regional-inverse", region, local, offset, 0, zoom);
  for (const extent of [1, 375, 1440, 8192])
    for (const canvas of [-8192 + extent / 2, 0, extent / 2, extent, 8192 + extent / 2])
      for (const zoom of zooms) push("canvas-inverse", 0n, 0.1, canvas, extent / 2, zoom);
  for (const region of regions)
    for (const zoom of zooms)
      for (const [start, current] of [
        [-8192, 8192],
        [8192, -8192],
        [0, 40],
        [40, 0],
      ])
        if (start !== undefined && current !== undefined)
          push("captured-pan", region, 0.1, start, current, zoom, 16384);
  for (const region of regions)
    for (const zoom of [0.125, 1, 8])
      for (const delta of [-(2 ** -38), -(2 ** -40), 2 ** -40, 2 ** -38])
        push("carry-tie", region, 0, delta, 0, zoom);
  for (const zoom of [next(0.1, -1n), 0, -1, next(8), Infinity, NaN])
    push("invalid-zoom", 0n, 0, 0, 0, zoom);
  for (const [a, b] of [
    [-Number.MIN_VALUE, 8192],
    [Number.MIN_VALUE, -8192],
    [next(8192), 0],
    [-next(8192), 0],
  ])
    if (a !== undefined && b !== undefined) push("exact-screen-bound", 0n, 0, a, b, 1);
  for (const local of [-1, 65536, NaN, Infinity]) push("invalid-local", 0n, local, 0, 0, 1);
  for (const zoom of [0.1, 1, 8]) push("negative-zero", 0n, -0, -0, 0, zoom);
  for (const exponent of [-1074, -1073, -1023, -1022, -1021, -1000, -512, -53, -1, 0, 15])
    for (const delta of [-1n, 0n, 1n]) {
      const value = numberFromBits(bits(2 ** exponent) + delta);
      for (const zoom of [0.1, 1, 8]) {
        push("exponent-band", 0n, value, 0, 0, zoom);
        push("exponent-band", 0n, 0, value, 0, zoom);
        push("exponent-band", 0n, 0, -value, 0, zoom);
      }
    }
  for (let exponent = -1074; exponent <= 15; exponent += 1)
    for (const delta of [-1n, 0n, 1n]) {
      const value = numberFromBits(bits(2 ** exponent) + delta);
      push("exponent-sweep", 0n, value, 0, 0, 1);
      push("exponent-sweep", 0n, 0, value, 0, 1);
      push("exponent-sweep", 0n, 0, -value, 0, 1);
    }
  return rows;
}
