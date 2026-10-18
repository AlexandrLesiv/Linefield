import { fixtures, minRegion, maxRegion } from "./fixtures.ts";
import { measure } from "./arithmetic.ts";
import { decode, subtract } from "./dyadic.ts";
export function matrix() {
  const before = JSON.stringify(fixtures, (_key, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  const rows = [];
  for (const fixture of fixtures) {
    for (const scale of [1 / 64, 1, 64]) {
      for (const zoom of [0.1, 1, 8]) {
        for (const method of [
          "relative-before-narrowing",
          "absolute-number-negative-control",
        ] as const) {
          rows.push({
            fixture: fixture.id,
            scale,
            zoom,
            method,
            ...measure(fixture, scale, zoom, method),
          });
        }
      }
    }
  }
  const after = JSON.stringify(fixtures, (_key, value: unknown) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  if (before !== after || rows.length > 288) throw Error("probe-bound-or-immutability-failure");
  const borrow = subtract(decode(65536), decode(Number.MIN_VALUE));
  const fixtureData: unknown = JSON.parse(before);
  return {
    scope: "synthetic-one-axis-arithmetic-only",
    fixtures: fixtureData,
    rows,
    counts: {
      rows: rows.length,
      finiteWithin: rows.filter((row) => row.outcome === "finite" && row.withinQuarterPoint).length,
      finiteOutside: rows.filter((row) => row.outcome === "finite" && !row.withinQuarterPoint)
        .length,
      nonfinite: rows.filter((row) => row.outcome === "nonfinite-candidate").length,
    },
    observations: {
      oppositeI64Difference: (maxRegion - minRegion).toString(),
      noncanonicalBorrowGap: {
        exactLocal: { numerator: borrow.n.toString(), binaryExponent: borrow.e },
        roundedLocal: 65536 - Number.MIN_VALUE,
        canonicalUpperExclusive: 65536,
        resolution: "unselected-normalization-policy",
      },
    },
    originalFixturesUnchanged: true,
    acceptance: "No runtime, renderer, supported-span or product acceptance claimed",
  };
}
