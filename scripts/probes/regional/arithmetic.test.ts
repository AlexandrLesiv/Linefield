import { test } from "node:test";
import assert from "node:assert/strict";
import { fixtures, maxRegion, minRegion } from "./fixtures.ts";
import { exactDelta, exactPoint, measure } from "./arithmetic.ts";
import type { Fixture } from "./arithmetic.ts";
import { equal, decode } from "./dyadic.ts";
function fixture(id: string): Fixture {
  const result = fixtures.find((row) => row.id === id);
  assert.ok(result);
  return result;
}
test("REG-PROBE-002 extreme integer subtraction needs wider than i64", () => {
  const delta = exactDelta({ region: maxRegion, local: 0 }, { region: minRegion, local: 0 });
  assert.ok(equal(delta, { n: (1n << 64n) - 1n, e: 16 }));
  assert.ok(maxRegion - minRegion > maxRegion);
});
test("REG-PROBE-003 exact relative geometry is translation invariant", () => {
  for (const scale of [1 / 64, 1, 64]) {
    for (const zoom of [0.1, 1, 8]) {
      assert.ok(
        equal(
          exactPoint(fixture("local-quarter"), scale, zoom),
          exactPoint(fixture("translated-quarter-at-max"), scale, zoom),
        ),
      );
      assert.ok(equal(exactPoint(fixture("anchor-identity"), scale, zoom), decode(0.5 * zoom)));
    }
  }
});
test("REG-PROBE-003 negative control loses visible quarter-unit displacement", () => {
  const row = fixture("translated-quarter-at-max");
  const relative = measure(row, 1, 8, "relative-before-narrowing");
  const absolute = measure(row, 1, 8, "absolute-number-negative-control");
  assert.equal(relative.outcome, "finite");
  assert.ok("approximateError" in relative && relative.approximateError === 0);
  assert.ok("approximateError" in absolute && absolute.approximateError === -2);
  assert.ok("withinQuarterPoint" in absolute && !absolute.withinQuarterPoint);
});
test("REG-PROBE-003 intermediate cancellation loses visible detail even with regional deltas", () => {
  const row = fixture("large-positive-cancellation");
  assert.ok(equal(exactPoint(row, 1, 8), decode(2)));
  const result = measure(row, 1, 8, "relative-before-narrowing");
  assert.ok("approximateError" in result && result.approximateError === -2);
  assert.ok("withinQuarterPoint" in result && !result.withinQuarterPoint);
});
test("REG-PROBE-004 noncanonical finite stress operands produce tagged overflow", () => {
  const base = fixture("local-quarter");
  const stress = { ...base, sample: { region: 0n, local: Number.MAX_VALUE } };
  assert.deepEqual(measure(stress, 64, 8, "relative-before-narrowing"), {
    outcome: "nonfinite-candidate",
  });
});
