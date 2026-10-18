import { test } from "node:test";
import assert from "node:assert/strict";
import { decode, equal, add, subtract, multiply, withinQuarter, approximate } from "./dyadic.ts";
test("REG-PROBE-001 binary64 decode has hand-derived boundary values", () => {
  assert.ok(equal(decode(0), { n: 0n, e: 0 }));
  assert.ok(equal(decode(-0), decode(0)));
  assert.deepEqual(decode(Number.MIN_VALUE), { n: 1n, e: -1074 });
  assert.ok(equal(decode(2 ** -1022), { n: 1n, e: -1022 }));
  assert.deepEqual(decode(2 ** -1022 - Number.MIN_VALUE), { n: (1n << 52n) - 1n, e: -1074 });
  assert.ok(equal(decode(-1.5), { n: -3n, e: -1 }));
  assert.ok(equal(decode(65536), { n: 1n, e: 16 }));
  assert.ok(equal(decode(65536 - 2 ** -37), { n: (1n << 53n) - 1n, e: -37 }));
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => decode(value));
});
test("REG-PROBE-001 exact arithmetic preserves known fractions and borrow gap", () => {
  assert.ok(equal(add(decode(0.5), decode(0.25)), { n: 3n, e: -2 }));
  assert.ok(equal(multiply(decode(-1.5), decode(0.25)), { n: -3n, e: -3 }));
  const exactBorrow = subtract(decode(65536), decode(Number.MIN_VALUE));
  assert.equal(equal(exactBorrow, decode(65536 - Number.MIN_VALUE)), false);
  assert.equal(65536 - Number.MIN_VALUE, 65536);
  assert.ok(subtract(exactBorrow, decode(65536 - 2 ** -37)).n > 0n);
});
test("REG-PROBE-004 tolerance comparison is exact including negative boundary", () => {
  const quarter = { n: 1n, e: -2 };
  const tiny = { n: 1n, e: -200 };
  assert.equal(withinQuarter(subtract(quarter, tiny)), true);
  assert.equal(withinQuarter(quarter), true);
  assert.equal(withinQuarter({ n: -1n, e: -2 }), true);
  assert.equal(withinQuarter(add(quarter, tiny)), false);
  assert.equal(withinQuarter({ n: -add(quarter, tiny).n, e: add(quarter, tiny).e }), false);
});
test("REG-PROBE-004 readable approximation does not prematurely underflow", () => {
  assert.equal(approximate({ n: 1n << 52n, e: -1125 }), Number.MIN_VALUE * 2);
  assert.equal(approximate({ n: -(1n << 52n), e: -1125 }), -Number.MIN_VALUE * 2);
  assert.equal(approximate({ n: 3n, e: -1076 }), Number.MIN_VALUE);
  assert.equal(approximate({ n: 0n, e: -2000 }), 0);
});
