import type { Catalog, Language, Value } from "./schema.ts";
import { formatted } from "./formats.ts";
export function gettext(
  catalog: Catalog,
  language: Language,
  localized: (id: string) => Value,
  source: (id: string) => Value,
): string {
  const plural =
    language === "en"
      ? "nplurals=2; plural=(n != 1);"
      : "nplurals=3; plural=(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<12 || n%100>14) ? 1 : 2);";
  const header = `Project-Id-Version: Linefield\nReport-Msgid-Bugs-To: \nPOT-Creation-Date: 2026-10-17 00:00+0000\nPO-Revision-Date: 2026-10-17 00:00+0000\nLast-Translator: Linefield\nLanguage-Team: ${language}\nLanguage: ${language}\nMIME-Version: 1.0\nContent-Type: text/plain; charset=UTF-8\nContent-Transfer-Encoding: 8bit\nPlural-Forms: ${plural}\n`;
  const rows = [
    `# Generated; edit shared/localization sources.\nmsgid ""\nmsgstr ${JSON.stringify(header)}\n`,
  ];
  for (const id of Object.keys(catalog.messages).sort()) {
    const message = catalog.messages[id]!;
    const original = source(id),
      value = localized(id);
    const fmt = (text: string): string => JSON.stringify(formatted(text, message, "linux"));
    rows.push(
      `#. ${message.context.replaceAll("\n", "\n#. ")}\n${Object.keys(message.arguments).length ? "#, c-format\n" : ""}msgctxt ${JSON.stringify(id)}`,
    );
    if (typeof original === "string" && typeof value === "string")
      rows.push(`msgid ${fmt(original)}\nmsgstr ${fmt(value)}\n`);
    else if (typeof original !== "string" && typeof value !== "string") {
      const names = language === "en" ? ["one", "other"] : ["one", "few", "many"];
      rows.push(
        `msgid ${fmt(original.one!)}\nmsgid_plural ${fmt(original.other!)}\n${names.map((category, index) => `msgstr[${index}] ${fmt(value[category]!)}`).join("\n")}\n`,
      );
    }
  }
  return rows.join("\n");
}
