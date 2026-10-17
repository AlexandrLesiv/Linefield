import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "./schema.ts";
import { generate } from "./generate.ts";
function fixture() {
  return {
    catalog: {
      version: 1,
      sourceLanguage: "en",
      messages: {
        "test.label": { kind: "plain", context: "Test label", arguments: { name: "string" } },
      },
    },
    translations: { en: { "test.label": "Hello {name}" }, uk: { "test.label": "Вітаю {name}" } },
  };
}
test("LOC-01 rejects schema, missing/extra translation and placeholder mismatch", () => {
  const good = fixture();
  assert.doesNotThrow(() => parse(good.catalog, good.translations));
  for (const catalog of [
    null,
    { ...good.catalog, version: 2 },
    { ...good.catalog, surprise: true },
    { ...good.catalog, messages: { "bad key": good.catalog.messages["test.label"] } },
  ])
    assert.throws(() => parse(catalog, good.translations));
  for (const uk of [
    {},
    { "test.label": "Привіт" },
    { "test.label": "{other}" },
    { "test.label": "{name, select, other{x}}" },
    { "test.label": "{name}", extra: "x" },
  ])
    assert.throws(() => parse(good.catalog, { ...good.translations, uk }));
  assert.throws(() =>
    parse(
      {
        ...good.catalog,
        messages: {
          "test.label": { ...good.catalog.messages["test.label"], arguments: { name: "date" } },
        },
      },
      good.translations,
    ),
  );
});
test("LOC-02 requires complete bounded plurals and integer selector", () => {
  const catalog = {
    version: 1,
    sourceLanguage: "en",
    messages: {
      "test.count": {
        kind: "plural",
        context: "Synthetic test count",
        arguments: { count: "integer" },
        selector: "count",
      },
    },
  };
  const translations = {
    en: { "test.count": { one: "{count} item", other: "{count} items" } },
    uk: {
      "test.count": {
        one: "{count} предмет",
        few: "{count} предмети",
        many: "{count} предметів",
        other: "{count} предмета",
      },
    },
  };
  const valid = parse(catalog, translations);
  const output = generate(valid.catalog, valid.translations);
  assert.match(output["android/values-uk/strings.xml"]!, /quantity="few"/);
  assert.match(output["apple/Localizable.xcstrings"]!, /"variations"/);
  assert.match(output["windows/uk/Resources.resw"]!, /test_count_many/);
  assert.match(output["linux/uk.po"]!, /msgstr\[2\]/);
  assert.throws(() =>
    parse(catalog, { ...translations, uk: { "test.count": { one: "{count}", other: "{count}" } } }),
  );
  assert.throws(() =>
    parse(
      {
        ...catalog,
        messages: { "test.count": { ...catalog.messages["test.count"], selector: "missing" } },
      },
      translations,
    ),
  );
});
test("LOC-03 overrides are complete, validated and platform-specific", () => {
  const { catalog, translations } = fixture();
  const message = catalog.messages["test.label"];
  const override = { android: { en: "Android {name}", uk: "Андроїд {name}" } };
  const valid = parse(
    { ...catalog, messages: { "test.label": { ...message, overrides: override } } },
    translations,
  );
  const output = generate(valid.catalog, valid.translations);
  assert.match(output["android/values/strings.xml"]!, /Android %1\$s/);
  assert.match(output["web/en.json"]!, /Hello \{name\}/);
  assert.throws(() =>
    parse(
      {
        ...catalog,
        messages: { "test.label": { ...message, overrides: { unknown: override.android } } },
      },
      translations,
    ),
  );
  assert.throws(() =>
    parse(
      {
        ...catalog,
        messages: { "test.label": { ...message, overrides: { android: { en: "Bad" } } } },
      },
      translations,
    ),
  );
  assert.throws(() =>
    parse(
      { ...catalog, messages: { "test.label": message, "test.Label": message } },
      {
        en: { ...translations.en, "test.Label": "{name}" },
        uk: { ...translations.uk, "test.Label": "{name}" },
      },
    ),
  );
});
test("LOC-04 native escaping preserves Unicode, literals and reordered arguments", () => {
  const catalog = {
    version: 1,
    sourceLanguage: "en",
    messages: {
      "test.label": {
        kind: "plain",
        context: "Quotes & <markup>",
        arguments: { name: "string", count: "integer" },
      },
    },
  };
  const text = `100% ' " <&> \\\nУкраїна {name}: {count} {name}`;
  const valid = parse(catalog, { en: { "test.label": text }, uk: { "test.label": text } });
  const output = generate(valid.catalog, valid.translations);
  assert.equal(JSON.parse(output["web/en.json"]!)["test.label"], text);
  assert.match(output["android/values/strings.xml"]!, /100%%/);
  assert.match(output["android/values/strings.xml"]!, /&lt;&amp;&gt;/);
  assert.match(output["android/values/strings.xml"]!, /%2\$s: %1\$d %2\$s/);
  assert.match(output["windows/en/Resources.resw"]!, /\{1\}: \{0\} \{1\}/);
  assert.match(output["apple/Localizable.xcstrings"]!, /%2\$@: %1\$lld/);
});
