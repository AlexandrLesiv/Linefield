import { test } from "node:test";
import assert from "node:assert/strict";
import { rational, fromNumber, divideR, withinQuarterR } from "./rational.ts";
import { inverseMatrix, inverseMeasure } from "./inverse.ts";
test("REG-INVERSE-01 exact fractions reduce signs, zero and binary64 inputs", () => {
  assert.deepEqual(rational(6n, -8n), { n: -3n, d: 4n });
  assert.deepEqual(rational(0n, -8n), { n: 0n, d: 1n });
  assert.deepEqual(fromNumber(0.1), { n: 3602879701896397n, d: 1n << 55n });
  assert.deepEqual(fromNumber(-0), rational(0n));
  assert.throws(() => divideR(rational(1n), rational(0n)), /zero-denominator/);
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => fromNumber(value));
});
test("REG-INVERSE-02 exact inverse error can be hidden by Number round-trip", () => {
  const result = inverseMeasure(1, 0, 0.1);
  assert.equal(result.outcome, "finite");
  if (result.outcome !== "finite") throw Error("expected finite");
  assert.equal(result.candidate, 10);
  assert.deepEqual(result.exact, {
    numerator: "36028797018963968",
    denominator: "3602879701896397",
  });
  assert.deepEqual(result.inverseError, { numerator: "2", denominator: "3602879701896397" });
  assert.deepEqual(result.projectedError, { numerator: "1", denominator: "18014398509481984" });
  assert.deepEqual(result.numberRoundTrip, { outcome: "finite", error: 0 });
  for (const sign of [-1n, 1n]) {
    assert.equal(withinQuarterR(rational(sign * 3n, 16n)), true);
    assert.equal(withinQuarterR(rational(sign, 4n)), true);
    assert.equal(withinQuarterR(rational(sign * 5n, 16n)), false);
    const denominator = 1n << 200n;
    const quarter = denominator / 4n;
    assert.equal(withinQuarterR(rational(sign * (quarter - 1n), denominator)), true);
    assert.equal(withinQuarterR(rational(sign * (quarter + 1n), denominator)), false);
  }
});
test("REG-INVERSE-03 matrix retains underflow and explicit overflow", () => {
  const rows = inverseMatrix();
  assert.equal(rows.length, 21);
  assert.deepEqual(rows, inverseMatrix());
  assert.equal(rows.filter((row) => row.outcome === "nonfinite-candidate").length, 1);
  const tiny = inverseMeasure(Number.MIN_VALUE, 0, 8);
  assert.equal(tiny.outcome, "finite");
  if (tiny.outcome !== "finite") throw Error("expected finite");
  assert.equal(tiny.candidate, 0);
  assert.deepEqual(tiny.inverseError, { numerator: "-1", denominator: (1n << 1077n).toString() });
  assert.deepEqual(tiny.projectedError, { numerator: "-1", denominator: (1n << 1074n).toString() });
  assert.equal(JSON.stringify(rows).includes("null"), false);
});
test("REG-INVERSE-01 invalid mapping operands reject before arithmetic", () => {
  for (const zoom of [0, -0, -1, NaN, Infinity]) assert.throws(() => inverseMeasure(1, 0, zoom));
  assert.throws(() => inverseMeasure(Infinity, 0, 1));
  assert.throws(() => inverseMeasure(1, NaN, 1));
});
