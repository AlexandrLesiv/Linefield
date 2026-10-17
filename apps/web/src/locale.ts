import en from "../../../shared/localization/generated/web/en.json" with { type: "json" };
import uk from "../../../shared/localization/generated/web/uk.json" with { type: "json" };
import type { MessageArguments } from "../../../shared/localization/generated/web/arguments.ts";
import contracts from "../../../shared/localization/generated/web/contracts.json" with { type: "json" };
import { formatMessage } from "./locale-format.ts";
import type { LocalizedValue, MessageContract } from "./locale-format.ts";
export type MessageId = keyof MessageArguments;
const catalogues = { en, uk } satisfies Record<"en" | "uk", Record<MessageId, LocalizedValue>>;
const languages = navigator.languages.length ? navigator.languages : [navigator.language];
export const locale =
  languages
    .map((value) => value.toLowerCase().split("-")[0])
    .find((value) => value === "en" || value === "uk") === "uk"
    ? "uk"
    : "en";
document.documentElement.lang = locale;
export function t<K extends MessageId>(
  id: K,
  ...args: keyof MessageArguments[K] extends never ? [] : [MessageArguments[K]]
): string {
  const values = args[0] as Record<string, string | number> | undefined;
  return formatMessage(
    catalogues[locale][id],
    contracts[id] as MessageContract,
    locale,
    navigator.language || locale,
    values,
  );
}
