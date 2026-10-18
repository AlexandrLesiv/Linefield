import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "./schema.ts";
import { generate } from "./generate.ts";
import { validateCatalogSource } from "../catalog-source.ts";

function fixture() {
  return {
    catalog: {
      version: 1,
      sourceLanguage: "en",
      messages: {
        "test.count": {
          kind: "plural",
          context: "Record fixture",
          arguments: { count: "integer" },
          selector: "count",
          overrides: {
            web: {
              en: { one: "{count}", other: "{count}" },
              uk: { one: "{count}", few: "{count}", many: "{count}", other: "{count}" },
            },
          },
        },
      },
    },
    translations: {
      en: { "test.count": { one: "{count}", other: "{count}" } },
      uk: { "test.count": { one: "{count}", few: "{count}", many: "{count}", other: "{count}" } },
    },
  };
}

test("LOC-PROTO-01 literal inherited translations are not own catalog data", () => {
  validateCatalogSource('export const data = { __proto__: { "test.label": "Inherited" } };');
  const catalog = {
    version: 1,
    sourceLanguage: "en",
    messages: { "test.label": { kind: "plain", context: "Fixture", arguments: {} } },
  };
  const en = { __proto__: { "test.label": "Inherited" } };
  assert.deepEqual(Object.keys(en), []);
  assert.equal(JSON.stringify(en), "{}");
  assert.throws(() => parse(catalog, { en, uk: { "test.label": "Власний" } }), /plain record/);
  const inherited = { __proto__: { version: 1, sourceLanguage: "en" }, messages: catalog.messages };
  assert.throws(() => parse(inherited, { en: {}, uk: {} }), /plain record/);
});

function records(value: object): object[] {
  return [
    value,
    ...Object.values(value).flatMap((child: unknown) =>
      child !== null && typeof child === "object" ? records(child) : [],
    ),
  ];
}

test("LOC-PROTO-02 every nested schema record rejects custom inheritance", () => {
  const baseline = fixture();
  const count = records(baseline.catalog).length + records(baseline.translations).length;
  for (let index = 0; index < count; index++) {
    const value = fixture();
    const entries = [...records(value.catalog), ...records(value.translations)];
    Object.setPrototypeOf(entries[index]!, { inherited: "not catalog data" });
    assert.throws(
      () => parse(value.catalog, value.translations),
      /plain record/,
      `record ${index}`,
    );
  }
});

test("LOC-PROTO-03 null dictionaries and ordinary records generate identical bytes", () => {
  const ordinary = fixture();
  const dictionaries = fixture();
  for (const record of records(dictionaries)) Object.setPrototypeOf(record, null);
  const before = JSON.stringify(dictionaries);
  const first = parse(ordinary.catalog, ordinary.translations);
  const second = parse(dictionaries.catalog, dictionaries.translations);
  assert.deepEqual(
    generate(first.catalog, first.translations),
    generate(second.catalog, second.translations),
  );
  assert.equal(JSON.stringify(dictionaries), before);
  assert.equal(Object.getPrototypeOf(dictionaries.catalog.messages), null);
});
