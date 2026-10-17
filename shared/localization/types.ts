export const platforms = ["web", "apple", "android", "windows", "linux"] as const;
export type Platform = (typeof platforms)[number];
export type Language = "en" | "uk";
export type Argument = "string" | "integer";
export type Value = string | Record<string, string>;
export interface Message {
  kind: "plain" | "plural";
  context: string;
  arguments: Record<string, Argument>;
  selector?: string;
  overrides?: Partial<Record<Platform, Record<Language, Value>>>;
}
export interface Catalog {
  version: 1;
  sourceLanguage: "en";
  messages: Record<string, Message>;
}
export type Translations = Record<Language, Record<string, Value>>;
export const categories = { en: ["one", "other"], uk: ["one", "few", "many", "other"] };
