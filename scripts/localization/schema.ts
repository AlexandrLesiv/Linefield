import { platforms, categories } from "../../shared/localization/types.ts";
import type { Catalog, Message, Language, Translations } from "../../shared/localization/types.ts";
export { platforms, categories } from "../../shared/localization/types.ts";
export type {
  Catalog,
  Message,
  Language,
  Translations,
  Platform,
  Value,
  Argument,
} from "../../shared/localization/types.ts";
function object(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Expected object");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw Error("Expected plain record");
}
function keys(value: object, allowed: string[]): void {
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) throw Error(`Unknown field: ${key}`);
}
function text(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    [...value].some((character) => {
      const code = character.codePointAt(0)!;
      return (
        (code < 32 && code !== 9 && code !== 10 && code !== 13) ||
        (code >= 0xd800 && code <= 0xdfff) ||
        code === 0xfffe ||
        code === 0xffff
      );
    })
  )
    throw Error("Invalid text");
}
function translation(value: unknown, message: Message, language: Language): void {
  let texts: unknown[];
  if (message.kind === "plain") texts = [value];
  else {
    object(value);
    if (Object.keys(value).sort().join() !== [...categories[language]].sort().join())
      throw Error("Plural categories mismatch");
    texts = Object.values(value);
  }
  for (const content of texts) {
    text(content);
    const names = [...content.matchAll(/\{([a-z][a-zA-Z0-9]*)\}/g)].map((match) => match[1]);
    if (/[{}]/.test(content.replace(/\{[a-z][a-zA-Z0-9]*\}/g, "")))
      throw Error("Unsupported message syntax");
    if ([...new Set(names)].sort().join() !== Object.keys(message.arguments).sort().join())
      throw Error("Placeholder mismatch");
  }
}
export function validate(catalog: unknown, translations: unknown): asserts catalog is Catalog {
  object(catalog);
  keys(catalog, ["version", "sourceLanguage", "messages"]);
  if (catalog.version !== 1 || catalog.sourceLanguage !== "en")
    throw Error("Unsupported catalog version/language");
  object(catalog.messages);
  object(translations);
  keys(translations, ["en", "uk"]);
  const resourceNames = new Set<string>();
  const windowsNames = new Set<string>();
  for (const [id, raw] of Object.entries(catalog.messages)) {
    if (!/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/.test(id)) throw Error("Invalid semantic ID");
    const resourceName = id.replaceAll(".", "_").toLowerCase();
    if (resourceNames.has(resourceName)) throw Error("Resource ID collision");
    resourceNames.add(resourceName);
    object(raw);
    keys(raw, ["kind", "context", "arguments", "selector", "overrides"]);
    text(raw.context);
    if (raw.kind !== "plain" && raw.kind !== "plural") throw Error("Unsupported message kind");
    const windowsKeys =
      raw.kind === "plural"
        ? categories.uk.map((category) => `${resourceName}_${category}`)
        : [resourceName];
    for (const key of windowsKeys) {
      if (windowsNames.has(key)) throw Error("Expanded resource ID collision");
      windowsNames.add(key);
    }
    object(raw.arguments);
    for (const [name, type] of Object.entries(raw.arguments)) {
      if (!/^[a-z][a-zA-Z0-9]*$/.test(name) || (type !== "string" && type !== "integer"))
        throw Error("Invalid argument");
    }
    if (raw.kind === "plural") {
      if (
        typeof raw.selector !== "string" ||
        raw.arguments[raw.selector] !== "integer" ||
        Object.keys(raw.arguments).length !== 1
      )
        throw Error("Plural requires one integer selector");
    } else if (raw.selector !== undefined) throw Error("Plain message cannot select plurals");
    const message = raw as unknown as Message;
    for (const language of ["en", "uk"] as const) {
      object(translations[language]);
      translation(translations[language][id], message, language);
    }
    if (raw.overrides !== undefined) {
      object(raw.overrides);
      keys(raw.overrides, [...platforms]);
      for (const override of Object.values(raw.overrides)) {
        object(override);
        keys(override, ["en", "uk"]);
        for (const language of ["en", "uk"] as const)
          translation(override[language], message, language);
      }
    }
  }
  for (const language of ["en", "uk"] as const) {
    object(translations[language]);
    keys(translations[language], Object.keys(catalog.messages));
  }
}
export function parse(
  catalog: unknown,
  translations: unknown,
): { catalog: Catalog; translations: Translations } {
  validate(catalog, translations);
  return { catalog, translations: translations as Translations };
}
