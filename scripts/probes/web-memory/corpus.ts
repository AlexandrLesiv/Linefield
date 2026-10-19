import { maximum, minimum, numberFromBits, bits, normalized } from "./oracle.ts";

export function corpus() {
  const rows: { input: string; expected?: string; kind: string }[] = [];
  const locals = [0, -0, Number.MIN_VALUE, -Number.MIN_VALUE, -0.1, 0.1, 65536, -65536];
  const offsets = [0, -(2 ** -38), -(2 ** -40), 2 ** -38, 2 ** -40];
  for (const region of [minimum, minimum + 1n, -1n, 0n, 1n, maximum - 1n, maximum]) {
    for (const a of locals) {
      for (const b of offsets) {
        rows.push({
          input: `N ${region} ${Object.is(a, -0) ? "-0" : a} ${b}`,
          expected: normalized(region, a, b),
          kind: "normalization",
        });
      }
    }
  }
  for (const a of [-8192, -0.1, 0, Number.MIN_VALUE, 0.1, 4096, 8192]) {
    for (const width of [Number.MIN_VALUE * 2, 1, 375, 1440, 8192]) {
      rows.push({
        input: `N 0 ${a} ${-width / 2}`,
        expected: normalized(0n, a, -width / 2),
        kind: "mapping",
      });
    }
  }
  for (const radius of [0.05, 0.5, 25.6, 256]) {
    for (const other of [0.05, radius, 256]) {
      const delta = Math.abs(radius - other);
      for (const distance of [
        0,
        Number.MIN_VALUE,
        delta,
        numberFromBits(bits(delta) + 1n),
        1,
        16384,
      ]) {
        for (const slope of [0, 0.5, 1]) {
          rows.push({
            input: `P -8192 -8192 ${-8192 + distance} ${-8192 + distance * slope} ${radius} ${other}`,
            kind: "paint",
          });
        }
      }
    }
  }
  for (const delta of [0, Number.MIN_VALUE, 0.45, 255.95]) {
    for (const distance of [delta, numberFromBits(bits(delta) + 1n)]) {
      rows.push({
        input: `P 0 0 ${distance} 0 0.05 ${0.05 + delta}`,
        kind: "paint-origin-boundary",
      });
    }
  }
  rows.push({ input: "P -4096 -4096 12288 12288 256 256", kind: "paint-projected-extreme" });
  for (const value of [Number.MIN_VALUE, Number.MIN_VALUE * 2, 2 ** -1022]) {
    rows.push({ input: `P 0 0 ${value} ${value} 256 256`, kind: "paint-subnormal-diagonal" });
  }
  for (const exponent of [-1074, -1073, -1023, -1022, -1021, -1000, -512, -53, -1, 0, 15])
    for (const delta of [-1n, 0n, 1n]) {
      const value = numberFromBits(bits(2 ** exponent) + delta);
      rows.push({
        input: `N 0 ${value} 0`,
        expected: normalized(0n, value, 0),
        kind: "normalization-exponent-band",
      });
    }
  for (const radius of [0.4, 204.8, 2048])
    for (const other of [radius, 2048])
      for (const slope of [0, 0.5, 1])
        rows.push({
          input: `P -1314816 -1314816 4096 ${-1314816 + 1318912 * slope} ${radius} ${other}`,
          kind: "paint-zoomed-extreme",
        });
  return rows;
}
