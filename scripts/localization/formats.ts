import type { Message, Platform } from "./schema.ts";
export const json = (value: unknown): string => JSON.stringify(value, null, 2) + "\n";
export const xml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("\r", "&#13;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
export const resourceId = (id: string): string => id.replaceAll(".", "_").toLowerCase();
export function formatted(text: string, message: Message, platform: Platform): string {
  const names = Object.keys(message.arguments).sort();
  const source =
    names.length === 0 || platform === "windows" || platform === "web"
      ? text
      : text.replaceAll("%", "%%");
  return source.replace(/\{([a-z][a-zA-Z0-9]*)\}/g, (_, name: string) => {
    const index = names.indexOf(name);
    if (platform === "windows") return `{${index}}`;
    if (platform === "web") return `{${name}}`;
    const type =
      message.arguments[name] === "integer"
        ? platform === "apple"
          ? "lld"
          : "d"
        : platform === "apple"
          ? "@"
          : "s";
    return `%${index + 1}$${type}`;
  });
}
export function android(text: string, message: Message): string {
  const escaped = formatted(text, message, "android")
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("'", "\\'")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t");
  return `"${xml(escaped)}"`;
}
export const xmlFile = (root: string, rows: string[]): string =>
  `<?xml version="1.0" encoding="utf-8"?>\n<${root}>\n${rows.join("\n")}\n</${root}>\n`;
