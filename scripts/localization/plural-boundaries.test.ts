import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMessage } from "../../apps/web/src/locale-format.ts";
const plural = { kind: "plural", selector: "count", arguments: { count: "integer" } } as const;
const forms = {
  one: "one:{count}",
  few: "few:{count}",
  many: "many:{count}",
  other: "other:{count}",
};
const seed = 0x1f18;
function counts(): number[] {
  const values = new Set(Array.from({ length: 200 }, (_, index) => index));
  for (const count of [999, 1000, 1001, 1011, 1021, 1111, 1121, 2147483646, 2147483647])
    values.add(count);
  for (let count = 2147483640; count <= 2147483647; count++) values.add(count);
  let state = seed;
  for (let sample = 0; sample < 512; sample++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    values.add(state & 0x7fffffff);
  }
  return [...values];
}
// Independent integer grammar, not a second Intl.PluralRules call.
function ukrainian(count: number): string {
  const tens = count % 100;
  const ones = count % 10;
  if (ones === 1 && tens !== 11) return "one";
  if (ones >= 2 && ones <= 4 && (tens < 12 || tens > 14)) return "few";
  return "many";
}
for (const language of ["en", "uk"]) {
  test(`LOC-13 ${language} bounded integer plural sweep seed${seed}`, () => {
    const cases = counts();
    assert.equal(cases.length, 727);
    for (const count of cases) {
      const category = language === "uk" ? ukrainian(count) : count === 1 ? "one" : "other";
      assert.equal(
        formatMessage(forms, plural, language, "en-US", { count }),
        `${category}:${new Intl.NumberFormat("en-US").format(count)}`,
        `seed=${seed};language=${language};count=${count}`,
      );
    }
  });
}
test("LOC-14 plural language and visibly different numeric regions remain independent", () => {
  for (const [language, region, count, expected] of [
    ["uk", "de-DE", 1234, "few:1.234"],
    ["uk", "en-US", 1234, "few:1,234"],
    ["en", "de-DE", 1234, "other:1.234"],
    ["en", "de-DE", 21, "other:21"],
    ["uk", "de-DE", 21, "one:21"],
    ["en", "uk-UA", 1001, "other:1\u00a0001"],
    ["uk", "en-US", 1001, "one:1,001"],
  ] as const) {
    assert.equal(formatMessage(forms, plural, language, region, { count }), expected);
  }
});
test("LOC-15 integer plural domain rejects invalid values before category formatting", () => {
  for (const count of [-0.1, -Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(
      () => formatMessage(forms, plural, "uk", "de-DE", { count }),
      /Invalid localization argument/,
    );
  }
  assert.throws(
    () =>
      formatMessage("{name}", { kind: "plain", arguments: { name: "string" } }, "uk", "de-DE", {
        name: 21,
      }),
    /Invalid localization argument/,
  );
});
test("LOC-16 repeated and reordered named substitutions preserve literal Unicode payloads", () => {
  const contract = { kind: "plain", arguments: { name: "string", count: "integer" } } as const;
  for (const name of [
    "",
    "{count} $& $` $'",
    "Київ e\u0301 🖊️ <b>name</b>",
    "line\nnext\tcolumn",
    "رسم\u200f",
  ]) {
    const values = Object.freeze({ name, count: 1234 });
    assert.equal(
      formatMessage("{name} / {count} / {name}", contract, "uk", "de-DE", values),
      `${name} / 1.234 / ${name}`,
    );
    assert.deepEqual(values, { name, count: 1234 });
    assert.equal(
      formatMessage("{name} / {count} / {name}", contract, "uk", "de-DE", { count: 1234, name }),
      `${name} / 1.234 / ${name}`,
    );
  }
});
