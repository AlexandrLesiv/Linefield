export type LocalizedValue = string | Readonly<Record<string, string>>;
export interface MessageContract {
  readonly kind: "plain" | "plural";
  readonly arguments: Readonly<Record<string, "string" | "integer">>;
  readonly selector?: string;
}
/** This bounded grammar is shared with the resource generator, not a general ICU parser. */
export function formatMessage(
  message: LocalizedValue,
  contract: MessageContract,
  language: string,
  region: string,
  values: Readonly<Record<string, string | number>> = {},
): string {
  if (Object.keys(values).sort().join() !== Object.keys(contract.arguments).sort().join()) {
    throw Error("Localization argument mismatch");
  }
  for (const [name, type] of Object.entries(contract.arguments)) {
    const value = values[name];
    if (
      type === "string"
        ? typeof value !== "string"
        : typeof value !== "number" ||
          !Number.isInteger(value) ||
          value < 0 ||
          value > 2_147_483_647
    ) {
      throw Error("Invalid localization argument");
    }
  }
  let selected: string;
  if (contract.kind === "plural") {
    const count = contract.selector ? values[contract.selector] : undefined;
    if (typeof message === "string" || typeof count !== "number")
      throw Error("Invalid plural contract");
    const category = new Intl.PluralRules(language).select(count);
    selected = message[category] ?? message.other ?? "";
  } else {
    if (typeof message !== "string") throw Error("Invalid plain contract");
    selected = message;
  }
  if (!selected) throw Error("Missing localization form");
  return selected.replace(/\{([a-z][a-zA-Z0-9]*)\}/g, (_, name: string) => {
    const value = values[name];
    if (value === undefined) throw Error("Missing localization argument");
    return typeof value === "number" ? new Intl.NumberFormat(region).format(value) : value;
  });
}
