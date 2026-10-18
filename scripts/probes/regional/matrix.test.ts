import { test } from "node:test";
import assert from "node:assert/strict";
import { matrix } from "./matrix.ts";
test("REG-PROBE-004 bounded matrix is deterministic and retains expected counterexamples", () => {
  const first = matrix();
  assert.deepEqual(matrix(), first);
  assert.equal(first.rows.length, 162);
  assert.equal(first.counts.nonfinite, 0);
  assert.ok(first.counts.finiteOutside > 0);
  assert.ok(first.counts.finiteWithin > 0);
  assert.equal(first.counts.finiteWithin + first.counts.finiteOutside, 162);
  assert.equal(first.originalFixturesUnchanged, true);
  for (const row of first.rows) {
    if (row.outcome === "finite") assert.ok(Number.isFinite(row.approximateError));
  }
});
