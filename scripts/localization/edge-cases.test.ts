import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "./schema.ts";
import { generate } from "./generate.ts";
test("LOC-06 plain percent stays literal and invalid XML scalars are rejected", () => {
  const catalog = {
    version: 1,
    sourceLanguage: "en",
    messages: { "test.label": { kind: "plain", context: "Literal label", arguments: {} } },
  };
  const translations = {
    en: { "test.label": "100% ready 😀" },
    uk: { "test.label": "100% готово 😀" },
  };
  const valid = parse(catalog, translations);
  const output = generate(valid.catalog, valid.translations);
  for (const content of Object.values(output)) assert.doesNotMatch(content, /100%%/);
  for (const text of ["bad\ufffe", "bad\uffff", "bad\ud800", "bad\udfff", "bad\u0001"])
    assert.throws(() => parse(catalog, { ...translations, en: { "test.label": text } }));
});
test("LOC-07 plural expansion cannot collide with a plain Windows resource", () => {
  const catalog = {
    version: 1,
    sourceLanguage: "en",
    messages: {
      "test.count": {
        kind: "plural",
        context: "Synthetic",
        arguments: { count: "integer" },
        selector: "count",
      },
      "test.count.one": { kind: "plain", context: "Synthetic", arguments: {} },
    },
  };
  const translations = {
    en: { "test.count": { one: "{count}", other: "{count}" }, "test.count.one": "one" },
    uk: {
      "test.count": { one: "{count}", few: "{count}", many: "{count}", other: "{count}" },
      "test.count.one": "один",
    },
  };
  assert.throws(() => parse(catalog, translations), /collision/);
  assert.throws(
    () =>
      parse(
        { ...catalog, messages: Object.fromEntries(Object.entries(catalog.messages).reverse()) },
        translations,
      ),
    /collision/,
  );
});

test("LOC-10 carriage returns survive XML newline normalization", () => {
  const catalog = {
    version: 1,
    sourceLanguage: "en",
    messages: { "test.line": { kind: "plain", context: "Whitespace fixture", arguments: {} } },
  };
  const translations = { en: { "test.line": "a\rb" }, uk: { "test.line": "а\rб" } };
  const valid = parse(catalog, translations);
  const output = generate(valid.catalog, valid.translations);
  assert.match(output["windows/en/Resources.resw"]!, /a&#13;b/);
  assert.match(output["android/values/strings.xml"]!, /a&#13;b/);
  assert.equal(JSON.parse(output["web/en.json"]!)["test.line"], "a\rb");
});
