import type { Fixture, Position } from "./arithmetic.ts";
export const minRegion = -(1n << 63n);
export const maxRegion = (1n << 63n) - 1n;
const p = (region: bigint, local = 0): Position => ({ region, local });
const zero = p(0n);
export const fixtures: readonly Fixture[] = [
  { id: "local-quarter", source: zero, sample: p(0n, 0.25), placement: zero, view: zero },
  {
    id: "translated-quarter-at-max",
    source: p(maxRegion),
    sample: p(maxRegion, 0.25),
    placement: p(maxRegion),
    view: p(maxRegion),
  },
  {
    id: "adjacent-max",
    source: p(maxRegion - 1n, 65535.75),
    sample: p(maxRegion, 0.25),
    placement: p(maxRegion, 10),
    view: p(maxRegion, 10),
  },
  {
    id: "adjacent-min",
    source: p(minRegion, 65535.75),
    sample: p(minRegion + 1n, 0.25),
    placement: p(minRegion, 10),
    view: p(minRegion, 10),
  },
  {
    id: "negative-region-crossing",
    source: p(-1n, 65535.75),
    sample: p(0n, 0.25),
    placement: zero,
    view: zero,
  },
  {
    id: "large-positive-cancellation",
    source: zero,
    sample: p(1n << 36n, 0.25),
    placement: zero,
    view: p(1n << 36n),
  },
  {
    id: "large-negative-cancellation",
    source: p(1n << 36n, 0.25),
    sample: zero,
    placement: p(1n << 36n),
    view: zero,
  },
  {
    id: "opposite-i64-extremes",
    source: p(minRegion, 0.25),
    sample: p(maxRegion, 0.75),
    placement: zero,
    view: zero,
  },
  {
    id: "anchor-identity",
    source: p(maxRegion, 0.75),
    sample: p(maxRegion, 0.75),
    placement: p(0n, 5),
    view: p(0n, 4.5),
  },
];
