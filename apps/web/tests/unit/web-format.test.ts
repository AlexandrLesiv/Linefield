import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMessage } from "../../src/locale-format.ts";
import type { MessageArguments } from "../../../../shared/localization/generated/web/arguments.ts";
import type { MessageContract, LocalizedValue } from "../../src/locale-format.ts";
// Compilation checks the generated argument type without suppressions or unsafe casts.
const titleArguments: MessageArguments["drawing.open"] = { name: "Literal $& <title>" };
test("LOC-08 browser formats plural contracts with locale-specific categories", () => {
  const contract: MessageContract = {
    kind: "plural",
    selector: "count",
    arguments: { count: "integer" },
  };
  const translations: Record<string, Record<string, LocalizedValue>> = {
    en: { "test.count": { one: "one {count}", other: "other {count}" } },
    uk: {
      "test.count": {
        one: "one {count}",
        few: "few {count}",
        many: "many {count}",
        other: "other {count}",
      },
    },
  };
  const contracts = { "test.count": contract };
  const en = translations.en!;
  const uk = translations.uk!;
  for (const [count, category] of [
    [0, "many"],
    [1, "one"],
    [2, "few"],
    [5, "many"],
    [11, "many"],
    [21, "one"],
    [22, "few"],
    [1000, "many"],
  ] as const) {
    assert.equal(
      formatMessage(uk["test.count"]!, contracts["test.count"]!, "uk", "en-US", { count }),
      `${category} ${new Intl.NumberFormat("en-US").format(count)}`,
    );
  }
  assert.equal(
    formatMessage(en["test.count"]!, contracts["test.count"]!, "en", "en-US", { count: 1 }),
    "one 1",
  );
  assert.equal(
    formatMessage(en["test.count"]!, contracts["test.count"]!, "en", "en-US", { count: 2 }),
    "other 2",
  );
});
test("LOC-09 integer domain, argument shape, Unicode and literal substitutions", () => {
  const contract = { kind: "plain", arguments: { count: "integer" } } as const;
  for (const count of [-1, 1.5, NaN, Infinity, 2147483648])
    assert.throws(() => formatMessage("{count}", contract, "en", "en-US", { count }));
  assert.throws(() => formatMessage("{count}", contract, "en", "en-US", {}));
  assert.throws(() => formatMessage("{count}", contract, "en", "en-US", { count: "1" }));
  assert.throws(() => formatMessage("{count}", contract, "en", "en-US", { count: 1, extra: 1 }));
  assert.equal(
    formatMessage("{count}", contract, "en", "en-US", { count: 2147483647 }),
    "2,147,483,647",
  );
  assert.equal(
    formatMessage(
      "Open {name}",
      { kind: "plain", arguments: { name: "string" } },
      "en",
      "en-US",
      titleArguments,
    ),
    "Open Literal $& <title>",
  );
});
